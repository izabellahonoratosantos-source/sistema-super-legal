import { criarApp } from "./server/app.js";

const porta = Number(process.env.PORT) || 3000;

const app = await criarApp();
const servidor = app.listen(porta, "0.0.0.0", () => {
  console.log(`LabEscola rodando em http://localhost:${porta}`);
  console.log(`Banco de dados: ${app.locals.banco ?? "desconhecido"}`);
});

servidor.on("error", (erro) => {
  if (erro.code === "EADDRINUSE") {
    console.error(`A porta ${porta} já está em uso.`);
  } else {
    console.error(erro);
  }
  process.exit(1);
});

async function encerrar(sinal) {
  console.log(`\n${sinal} recebido, encerrando...`);
  servidor.close(async () => {
    await app.encerrarBanco?.();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5_000).unref();
}

process.on("SIGTERM", () => encerrar("SIGTERM"));
process.on("SIGINT", () => encerrar("SIGINT"));
