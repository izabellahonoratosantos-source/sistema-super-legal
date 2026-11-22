import crypto from "node:crypto";
import { normalizarAulas } from "../shared/dominio.js";

const SELECT_RESERVAS = `
  SELECT r.id,
         r.lab_id,
         r.turno,
         to_char(r.data, 'YYYY-MM-DD') AS data,
         r.materia,
         r.turma,
         r.turma_nome,
         r.serie,
         r.professor,
         r.professor_email,
         r.criado_em,
         r.atualizado_em,
         COALESCE(array_agg(h.aula ORDER BY h.aula) FILTER (WHERE h.aula IS NOT NULL), '{}') AS aulas
    FROM reservas r
    LEFT JOIN horarios h ON h.reserva_id = r.id
`;

const SELECT_POR_ID = `${SELECT_RESERVAS} WHERE r.id = $1 GROUP BY r.id`;

export class ErroConflito extends Error {
  constructor() {
    super("Horário indisponível: já existe uma reserva para este laboratório neste período.");
    this.status = 409;
  }
}

export function criarRepositorio(db) {
  async function inserirHorarios(executar, reservaId, dados) {
    await executar(
      `INSERT INTO horarios (lab_id, turno, data, aula, reserva_id)
       SELECT $1, $2, $3, t.aula, $5
         FROM unnest($4::int[]) AS t(aula)`,
      [dados.labId, dados.turno, dados.data, dados.aulas, reservaId]
    );
  }

  return {
    async listarReservas() {
      const linhas = await db.executar(`${SELECT_RESERVAS} GROUP BY r.id ORDER BY r.data, r.turno, r.id`);
      return linhas.map(paraReserva);
    },

    async buscarReserva(id) {
      const [linha] = await db.executar(SELECT_POR_ID, [id]);
      return linha ? paraReserva(linha) : null;
    },

    async criarReserva(dados, professor) {
      const id = crypto.randomUUID();

      return tratarConflito(() =>
        db.transacao(async (executar) => {
          await executar(
            `INSERT INTO reservas
               (id, lab_id, turno, data, materia, turma, turma_nome, serie, professor, professor_email)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              id,
              dados.labId,
              dados.turno,
              dados.data,
              dados.materia,
              dados.turma,
              dados.turmaNome,
              dados.serie,
              professor.nome,
              professor.email,
            ]
          );

          await inserirHorarios(executar, id, dados);
          const [linha] = await executar(SELECT_POR_ID, [id]);
          return paraReserva(linha);
        })
      );
    },

    async atualizarReserva(id, dados) {
      return tratarConflito(() =>
        db.transacao(async (executar) => {
          const atualizadas = await executar(
            `UPDATE reservas
                SET lab_id = $2,
                    turno = $3,
                    data = $4,
                    materia = $5,
                    turma = $6,
                    turma_nome = $7,
                    serie = $8,
                    atualizado_em = now()
              WHERE id = $1
              RETURNING id`,
            [id, dados.labId, dados.turno, dados.data, dados.materia, dados.turma, dados.turmaNome, dados.serie]
          );

          if (atualizadas.length === 0) return null;

          await executar("DELETE FROM horarios WHERE reserva_id = $1", [id]);
          await inserirHorarios(executar, id, dados);

          const [linha] = await executar(SELECT_POR_ID, [id]);
          return paraReserva(linha);
        })
      );
    },

    async excluirReserva(id) {
      const excluidas = await db.executar("DELETE FROM reservas WHERE id = $1 RETURNING id", [id]);
      return excluidas.length > 0;
    },

    async contarReservas() {
      const [linha] = await db.executar("SELECT COUNT(*)::int AS total FROM reservas");
      return linha?.total ?? 0;
    },

    async salvarUsuario({ nome, email, cpf }) {
      const [linha] = await db.executar(
        `INSERT INTO usuarios (id, nome, email, cpf)
              VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE
                 SET nome = EXCLUDED.nome,
                     cpf = EXCLUDED.cpf,
                     atualizado_em = now()
           RETURNING id, nome, email`,
        [crypto.randomUUID(), nome, email, cpf]
      );
      return { id: linha.id, nome: linha.nome, email: linha.email };
    },
  };
}

function paraReserva(linha) {
  return {
    id: linha.id,
    labId: linha.lab_id,
    turno: linha.turno,
    data: linha.data,
    aulas: normalizarAulas(linha.aulas ?? []),
    materia: linha.materia,
    turma: linha.turma,
    turmaNome: linha.turma_nome,
    serie: linha.serie,
    professor: linha.professor,
    professorEmail: linha.professor_email,
    criadoEm: linha.criado_em,
    atualizadoEm: linha.atualizado_em,
  };
}

async function tratarConflito(acao) {
  try {
    return await acao();
  } catch (erro) {
    const violouUnicidade = erro?.code === "23505" || /duplicate key|unique constraint/i.test(erro?.message ?? "");
    if (violouUnicidade) throw new ErroConflito();
    throw erro;
  }
}
