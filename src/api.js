const CHAVE_TOKEN = "agendamento-lab-token";

export function lerToken() {
  try {
    return sessionStorage.getItem(CHAVE_TOKEN) ?? "";
  } catch {
    return "";
  }
}

export function definirToken(token) {
  try {
    sessionStorage.setItem(CHAVE_TOKEN, token);
  } catch {
    /* armazenamento indisponível (modo privado) */
  }
}

export function limparToken() {
  try {
    sessionStorage.removeItem(CHAVE_TOKEN);
  } catch {
    /* ignora */
  }
}

async function requisitar(caminho, { metodo = "GET", corpo } = {}) {
  const token = lerToken();

  let resposta;
  try {
    resposta = await fetch(`/api${caminho}`, {
      method: metodo,
      headers: {
        ...(corpo ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new Error("Sem conexão com o servidor. Verifique sua internet e tente novamente.");
  }

  if (resposta.status === 204) return null;

  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    const erro = new Error(dados?.erro ?? `Falha na requisição (${resposta.status}).`);
    erro.status = resposta.status;
    throw erro;
  }
  return dados;
}

export const api = {
  login: (dados) => requisitar("/login", { metodo: "POST", corpo: dados }),
  saude: () => requisitar("/health"),
  listarReservas: () => requisitar("/reservas").then((dados) => dados.reservas),
  criarReserva: (dados) => requisitar("/reservas", { metodo: "POST", corpo: dados }).then((r) => r.reserva),
  atualizarReserva: (id, dados) =>
    requisitar(`/reservas/${id}`, { metodo: "PUT", corpo: dados }).then((r) => r.reserva),
  excluirReserva: (id) => requisitar(`/reservas/${id}`, { metodo: "DELETE" }),
};
