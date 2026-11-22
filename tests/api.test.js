import assert from "node:assert/strict";
import test from "node:test";

process.env.PGLITE_DATA = "memory://";
process.env.SESSION_SECRET = "segredo-de-teste";
process.env.SEED_DEMO = "false";

const { criarApp } = await import("../server/app.js");

const app = await criarApp();
const servidor = app.listen(0);
await new Promise((resolver) => servidor.once("listening", resolver));
const base = `http://127.0.0.1:${servidor.address().port}`;

test.after(async () => {
  await new Promise((resolver) => servidor.close(resolver));
  await app.encerrarBanco();
});

async function chamar(metodo, caminho, { corpo, token } = {}) {
  const resposta = await fetch(`${base}${caminho}`, {
    method: metodo,
    headers: {
      ...(corpo ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await resposta.text();
  return { status: resposta.status, dados: texto ? JSON.parse(texto) : null };
}

const CPF = "529.982.247-25";
const dataFutura = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);

let token = "";
let reservaId = "";

test("health responde com o banco conectado", async () => {
  const { status, dados } = await chamar("GET", "/api/health");
  assert.equal(status, 200);
  assert.equal(dados.ok, true);
  assert.match(dados.banco, /PGlite|PostgreSQL/);
});

test("login recusa CPF inválido", async () => {
  const { status } = await chamar("POST", "/api/login", {
    corpo: { nome: "Teste", email: "teste@escola.com.br", cpf: "111.111.111-11" },
  });
  assert.equal(status, 400);
});

test("login devolve usuário e token", async () => {
  const { status, dados } = await chamar("POST", "/api/login", {
    corpo: { nome: "Professora Teste", email: "teste@escola.com.br", cpf: CPF },
  });
  assert.equal(status, 200);
  assert.equal(dados.usuario.email, "teste@escola.com.br");
  assert.ok(dados.token);
  token = dados.token;
});

test("rotas de reservas exigem sessão", async () => {
  const { status } = await chamar("GET", "/api/reservas");
  assert.equal(status, 401);
});

test("cria reserva", async () => {
  const { status, dados } = await chamar("POST", "/api/reservas", {
    token,
    corpo: { labId: "lab1", turno: "manha", data: dataFutura, aulas: [1, 2], materia: "Matemática", turma: "2A" },
  });
  assert.equal(status, 201);
  assert.deepEqual(dados.reserva.aulas, [1, 2]);
  assert.equal(dados.reserva.professorEmail, "teste@escola.com.br");
  reservaId = dados.reserva.id;
});

test("consulta lista reservas", async () => {
  const { status, dados } = await chamar("GET", "/api/reservas", { token });
  assert.equal(status, 200);
  assert.equal(dados.reservas.length, 1);
});

test("bloqueia conflito de horário", async () => {
  const { status, dados } = await chamar("POST", "/api/reservas", {
    token,
    corpo: { labId: "lab1", turno: "manha", data: dataFutura, aulas: [2, 3], materia: "Física", turma: "2A" },
  });
  assert.equal(status, 409);
  assert.match(dados.erro, /indisponível/i);
});

test("valida turma incompatível com o turno", async () => {
  const { status } = await chamar("POST", "/api/reservas", {
    token,
    corpo: { labId: "lab1", turno: "manha", data: dataFutura, aulas: [4], materia: "Arte", turma: "9A" },
  });
  assert.equal(status, 400);
});

test("edita reserva", async () => {
  const { status, dados } = await chamar("PUT", `/api/reservas/${reservaId}`, {
    token,
    corpo: { labId: "lab1", turno: "manha", data: dataFutura, aulas: [3, 4], materia: "Matemática Aplicada", turma: "2A" },
  });
  assert.equal(status, 200);
  assert.deepEqual(dados.reserva.aulas, [3, 4]);
});

test("outro professor não pode editar nem excluir", async () => {
  const login = await chamar("POST", "/api/login", {
    corpo: { nome: "Outro Professor", email: "outro@escola.com.br", cpf: CPF },
  });

  const edicao = await chamar("PUT", `/api/reservas/${reservaId}`, {
    token: login.dados.token,
    corpo: { labId: "lab1", turno: "manha", data: dataFutura, aulas: [5], materia: "Arte", turma: "2A" },
  });
  assert.equal(edicao.status, 403);

  const exclusao = await chamar("DELETE", `/api/reservas/${reservaId}`, { token: login.dados.token });
  assert.equal(exclusao.status, 403);
});

test("exclui reserva", async () => {
  const { status } = await chamar("DELETE", `/api/reservas/${reservaId}`, { token });
  assert.equal(status, 204);

  const repetido = await chamar("DELETE", `/api/reservas/${reservaId}`, { token });
  assert.equal(repetido.status, 404);
});

test("serve o front-end e o manifest do PWA", async () => {
  const manifest = await fetch(`${base}/manifest.json`);
  assert.equal(manifest.status, 200);
  assert.match(manifest.headers.get("content-type"), /json/);
});
