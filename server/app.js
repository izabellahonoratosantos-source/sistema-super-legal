import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { cpfEhValido, ehDono, emailEhValido, validarReserva } from "../shared/dominio.js";
import { criarToken, exigirSessao, segredoEhTemporario } from "./auth.js";
import { conectar } from "./db.js";
import { criarRepositorio, ErroConflito } from "./repositorio.js";
import { semearDemonstracao } from "./seed.js";

const RAIZ = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const DIST = path.join(RAIZ, "dist");

export async function criarApp() {
  const db = await conectar();
  const repo = criarRepositorio(db);

  if (process.env.SEED_DEMO === "true") {
    await semearDemonstracao(repo);
  }

  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "100kb" }));
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  // ---------- Infraestrutura ----------
  app.get("/healthz", (req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/health", async (req, res, next) => {
    try {
      res.json({
        ok: true,
        banco: db.nome,
        reservas: await repo.contarReservas(),
        sessao: segredoEhTemporario ? "temporária (defina SESSION_SECRET)" : "configurada",
      });
    } catch (erro) {
      next(erro);
    }
  });

  // ---------- Autenticação ----------
  app.post("/api/login", async (req, res, next) => {
    try {
      const nome = String(req.body?.nome ?? "").trim();
      const email = String(req.body?.email ?? "").trim().toLowerCase();
      const cpf = String(req.body?.cpf ?? "").trim();

      if (nome.length < 2 || nome.length > 80) {
        return res.status(400).json({ erro: "Informe seu nome completo." });
      }
      if (!emailEhValido(email)) {
        return res.status(400).json({ erro: "Informe um e-mail válido." });
      }
      if (!cpfEhValido(cpf)) {
        return res.status(400).json({ erro: "Informe um CPF válido." });
      }

      const usuario = await repo.salvarUsuario({ nome, email, cpf });
      return res.json({ usuario, token: criarToken(usuario) });
    } catch (erro) {
      return next(erro);
    }
  });

  // ---------- CRUD de reservas ----------
  const api = express.Router();
  api.use(exigirSessao);

  api.get("/reservas", async (req, res, next) => {
    try {
      res.json({ reservas: await repo.listarReservas() });
    } catch (erro) {
      next(erro);
    }
  });

  api.post("/reservas", async (req, res, next) => {
    try {
      const reservas = await repo.listarReservas();
      const { erro, dados, conflito } = validarReserva(req.body, { reservas });
      if (erro) return res.status(conflito ? 409 : 400).json({ erro });

      const reserva = await repo.criarReserva(dados, req.usuario);
      return res.status(201).json({ reserva });
    } catch (erro) {
      if (erro instanceof ErroConflito) return res.status(409).json({ erro: erro.message });
      return next(erro);
    }
  });

  api.put("/reservas/:id", async (req, res, next) => {
    try {
      const existente = await repo.buscarReserva(req.params.id);
      if (!existente) return res.status(404).json({ erro: "Reserva não encontrada." });
      if (!ehDono(existente, req.usuario)) {
        return res.status(403).json({ erro: "Você não tem permissão para editar este agendamento." });
      }

      const reservas = await repo.listarReservas();
      const { erro, dados, conflito } = validarReserva(req.body, { reservas, ignorarId: existente.id });
      if (erro) return res.status(conflito ? 409 : 400).json({ erro });

      const reserva = await repo.atualizarReserva(existente.id, dados);
      return res.json({ reserva });
    } catch (erro) {
      if (erro instanceof ErroConflito) return res.status(409).json({ erro: erro.message });
      return next(erro);
    }
  });

  api.delete("/reservas/:id", async (req, res, next) => {
    try {
      const existente = await repo.buscarReserva(req.params.id);
      if (!existente) return res.status(404).json({ erro: "Reserva não encontrada." });
      if (!ehDono(existente, req.usuario)) {
        return res.status(403).json({ erro: "Você não tem permissão para excluir este agendamento." });
      }

      await repo.excluirReserva(existente.id);
      return res.status(204).end();
    } catch (erro) {
      return next(erro);
    }
  });

  api.use((req, res) => {
    res.status(404).json({ erro: "Rota não encontrada." });
  });

  app.use("/api", api);

  // ---------- Front-end (build do Vite) ----------
  const temBuild = existsSync(path.join(DIST, "index.html"));

  if (temBuild) {
    app.use(
      express.static(DIST, {
        index: false,
        maxAge: "1h",
        setHeaders(res, arquivo) {
          if (/(sw\.js|manifest\.json|index\.html)$/.test(arquivo)) {
            res.setHeader("Cache-Control", "no-cache");
          }
        },
      })
    );

    app.get(/^(?!\/api\/).*/, (req, res, next) => {
      if (/\.[a-z0-9]+$/i.test(req.path)) return next();
      return res.sendFile(path.join(DIST, "index.html"));
    });

    app.use((req, res) => {
      res.status(404).type("text/plain").send("Arquivo não encontrado.");
    });
  } else {
    app.get("/", (req, res) => {
      res
        .status(503)
        .type("text/plain")
        .send("Build não encontrado. Rode `npm run build` antes de iniciar o servidor.");
    });
  }

  // ---------- Tratamento de erros ----------
  app.use((erro, req, res, _next) => {
    if (erro instanceof SyntaxError && "body" in erro) {
      return res.status(400).json({ erro: "JSON inválido no corpo da requisição." });
    }
    console.error("[erro]", erro);
    return res.status(erro.status ?? 500).json({ erro: "Erro interno no servidor." });
  });

  app.encerrarBanco = () => db.encerrar();
  app.locals.banco = db.nome;

  return app;
}
