import { TURMAS } from "../shared/dominio.js";

function isoLocal(data) {
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

function proximoDiaUtil(data) {
  const copia = new Date(data);
  while (copia.getDay() === 0 || copia.getDay() === 6) {
    copia.setDate(copia.getDate() + 1);
  }
  return copia;
}

function somarDiasUteis(data, quantidade) {
  const copia = new Date(data);
  let restantes = quantidade;
  while (restantes > 0) {
    copia.setDate(copia.getDate() + 1);
    if (copia.getDay() !== 0 && copia.getDay() !== 6) restantes -= 1;
  }
  return copia;
}

const EXEMPLOS = [
  { labId: "lab1", turno: "manha", turma: "2A", aulas: [1, 2], materia: "Matemática", dia: 0 },
  { labId: "lab-ciencias", turno: "manha", turma: "3A", aulas: [4, 5], materia: "Biologia", dia: 1 },
  { labId: "lab2", turno: "tarde", turma: "7A", aulas: [1, 2, 3], materia: "Informática", dia: 2 },
  { labId: "auditorio", turno: "tarde", turma: "1B-DS", aulas: [5, 6], materia: "História", dia: 3 },
];

/**
 * Popula o banco com alguns agendamentos de exemplo na primeira execução.
 * Controlado pela variável de ambiente SEED_DEMO=true.
 */
export async function semearDemonstracao(repo) {
  if ((await repo.contarReservas()) > 0) return;

  const professor = { nome: "Professor Demonstração", email: "demo@escola.com.br" };
  const base = proximoDiaUtil(new Date());

  for (const exemplo of EXEMPLOS) {
    const turma = TURMAS.find((t) => t.id === exemplo.turma);
    await repo.criarReserva(
      {
        labId: exemplo.labId,
        turno: exemplo.turno,
        data: isoLocal(somarDiasUteis(base, exemplo.dia)),
        aulas: exemplo.aulas,
        materia: exemplo.materia,
        turma: turma.id,
        turmaNome: turma.nome,
        serie: turma.serie,
      },
      professor
    );
  }

  console.log(`[seed] ${EXEMPLOS.length} reservas de demonstração criadas.`);
}
