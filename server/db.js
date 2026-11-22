import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const DIR_DADOS = path.join(RAIZ, "data");

/**
 * Camada de acesso ao banco.
 *
 * Em produção usamos PostgreSQL (variável DATABASE_URL, provisionada pelo Render).
 * Em desenvolvimento, se DATABASE_URL não existir, usamos o PGlite — um PostgreSQL
 * compilado para WebAssembly que roda dentro do Node e grava em `data/pglite`.
 * O SQL é exatamente o mesmo nos dois casos.
 */
export async function conectar() {
  const url = process.env.DATABASE_URL?.trim();

  if (url) {
    const pg = (await import("pg")).default;
    const pool = new pg.Pool({
      connectionString: url,
      max: 5,
      idleTimeoutMillis: 30_000,
      ssl: usarSSL(url) ? { rejectUnauthorized: false } : undefined,
    });

    const adaptador = {
      nome: "PostgreSQL",
      async executar(sql, parametros = []) {
        const resultado = await pool.query(sql, parametros);
        return resultado.rows;
      },
      async executarScript(sql) {
        await pool.query(sql);
      },
      async transacao(fn) {
        const cliente = await pool.connect();
        try {
          await cliente.query("BEGIN");
          const resultado = await fn(async (sql, parametros = []) => (await cliente.query(sql, parametros)).rows);
          await cliente.query("COMMIT");
          return resultado;
        } catch (erro) {
          await cliente.query("ROLLBACK").catch(() => {});
          throw erro;
        } finally {
          cliente.release();
        }
      },
      async encerrar() {
        await pool.end();
      },
    };

    await criarEsquema(adaptador);
    return adaptador;
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const origem = process.env.PGLITE_DATA?.trim() || path.join(DIR_DADOS, "pglite");
  const emMemoria = origem.startsWith("memory://");
  if (!emMemoria) await fs.mkdir(origem, { recursive: true });

  const pglite = new PGlite(origem);
  await pglite.waitReady;

  const adaptador = {
    nome: "PGlite (PostgreSQL local)",
    async executar(sql, parametros = []) {
      const resultado = await pglite.query(sql, parametros);
      return resultado.rows;
    },
    async executarScript(sql) {
      await pglite.exec(sql);
    },
    async transacao(fn) {
      return pglite.transaction(async (tx) => fn(async (sql, parametros = []) => (await tx.query(sql, parametros)).rows));
    },
    async encerrar() {
      await pglite.close();
    },
  };

  await criarEsquema(adaptador);
  return adaptador;
}

function usarSSL(url) {
  return /sslmode=(require|verify-ca|verify-full)/.test(url) || process.env.PGSSL === "true";
}

async function criarEsquema(db) {
  await db.executarScript(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id            TEXT PRIMARY KEY,
      nome          TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      cpf           TEXT NOT NULL,
      criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS reservas (
      id              TEXT PRIMARY KEY,
      lab_id          TEXT NOT NULL,
      turno           TEXT NOT NULL,
      data            DATE NOT NULL,
      materia         TEXT NOT NULL,
      turma           TEXT NOT NULL,
      turma_nome      TEXT NOT NULL,
      serie           TEXT NOT NULL,
      professor       TEXT NOT NULL,
      professor_email TEXT NOT NULL,
      criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
      atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Chave natural de ocupação: garante no próprio banco que um laboratório
    -- não tenha duas reservas na mesma data/turno/aula.
    CREATE TABLE IF NOT EXISTS horarios (
      lab_id     TEXT NOT NULL,
      turno      TEXT NOT NULL,
      data       DATE NOT NULL,
      aula       INTEGER NOT NULL CHECK (aula BETWEEN 1 AND 6),
      reserva_id TEXT NOT NULL REFERENCES reservas (id) ON DELETE CASCADE,
      PRIMARY KEY (lab_id, turno, data, aula)
    );

    CREATE INDEX IF NOT EXISTS idx_reservas_data ON reservas (data);
    CREATE INDEX IF NOT EXISTS idx_horarios_reserva ON horarios (reserva_id);
  `);
}
