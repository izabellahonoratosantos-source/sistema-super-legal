const BASE = process.env.API_BASE || "http://127.0.0.1:3100";

async function chamar(metodo, caminho, corpo, token) {
  const resposta = await fetch(`${BASE}${caminho}`, {
    method: metodo,
    headers: {
      ...(corpo ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await resposta.text();
  let dados = null;
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = texto.slice(0, 120);
  }
  return { status: resposta.status, dados };
}

function ok(condicao, rotulo) {
  console.log(`${condicao ? "PASS" : "FALHA"}  ${rotulo}`);
  if (!condicao) process.exitCode = 1;
}

const saude = await chamar("GET", "/api/health");
ok(saude.status === 200, `health -> ${saude.status} (${saude.dados?.banco}, ${saude.dados?.reservas} reservas)`);

const semToken = await chamar("GET", "/api/reservas");
ok(semToken.status === 401, `GET /api/reservas sem token -> ${semToken.status}`);

const login = await chamar("POST", "/api/login", {
  nome: "Professora Teste",
  email: "teste.api@escola.com.br",
  cpf: "529.982.247-25",
});
ok(login.status === 200 && login.dados?.token, `login -> ${login.status}`);
const token = login.dados.token;

const cpfRuim = await chamar("POST", "/api/login", { nome: "X", email: "a@b.com", cpf: "111.111.111-11" });
ok(cpfRuim.status === 400, `login com CPF inválido -> ${cpfRuim.status}`);

const listaInicial = await chamar("GET", "/api/reservas", null, token);
ok(listaInicial.status === 200 && Array.isArray(listaInicial.dados.reservas), `listar -> ${listaInicial.dados?.reservas?.length} reservas`);

const hoje = new Date();
const data = new Date(hoje.getTime() + 7 * 86400000).toISOString().slice(0, 10);

const criada = await chamar(
  "POST",
  "/api/reservas",
  { labId: "lab3", turno: "manha", data, aulas: [1, 2], materia: "Física", turma: "1A" },
  token
);
ok(criada.status === 201 && criada.dados?.reserva?.aulas?.join(",") === "1,2", `criar -> ${criada.status}`);
const id = criada.dados.reserva.id;

const conflito = await chamar(
  "POST",
  "/api/reservas",
  { labId: "lab3", turno: "manha", data, aulas: [2, 3], materia: "Química", turma: "1B" },
  token
);
ok(conflito.status === 409, `conflito de horário -> ${conflito.status} (${conflito.dados?.erro})`);

const invalida = await chamar(
  "POST",
  "/api/reservas",
  { labId: "lab3", turno: "manha", data, aulas: [7], materia: "X", turma: "9A" },
  token
);
ok(invalida.status === 400, `validação de aulas -> ${invalida.status}`);

const atualizada = await chamar(
  "PUT",
  `/api/reservas/${id}`,
  { labId: "lab3", turno: "manha", data, aulas: [3, 4], materia: "Física Aplicada", turma: "1A" },
  token
);
ok(atualizada.status === 200 && atualizada.dados?.reserva?.aulas?.join(",") === "3,4", `editar -> ${atualizada.status}`);

const outroLogin = await chamar("POST", "/api/login", {
  nome: "Outro Professor",
  email: "outro@escola.com.br",
  cpf: "529.982.247-25",
});
const outroToken = outroLogin.dados.token;

const editarDeOutro = await chamar("PUT", `/api/reservas/${id}`, {
  labId: "lab3", turno: "manha", data, aulas: [5], materia: "Arte", turma: "1A",
}, outroToken);
ok(editarDeOutro.status === 403, `editar reserva de outro professor -> ${editarDeOutro.status}`);

const excluirDeOutro = await chamar("DELETE", `/api/reservas/${id}`, null, outroToken);
ok(excluirDeOutro.status === 403, `excluir reserva de outro professor -> ${excluirDeOutro.status}`);

const excluir = await chamar("DELETE", `/api/reservas/${id}`, null, token);
ok(excluir.status === 204, `excluir -> ${excluir.status}`);

const excluirDeNovo = await chamar("DELETE", `/api/reservas/${id}`, null, token);
ok(excluirDeNovo.status === 404, `excluir novamente -> ${excluirDeNovo.status}`);

const pagina = await fetch(`${BASE}/qualquer/rota`);
const html = await pagina.text();
ok(pagina.status === 200 && html.includes('id="root"'), `SPA fallback -> ${pagina.status}`);

const sw = await fetch(`${BASE}/sw.js`);
ok(sw.status === 200, `sw.js -> ${sw.status}`);

console.log("\nConcluído.");
