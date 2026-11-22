/**
 * Regras de negócio compartilhadas entre o front-end (React) e o back-end (Node).
 * Manter as constantes em um único lugar evita divergência entre o que a tela
 * permite e o que a API aceita.
 */

export const LABORATORIOS = [
  { id: "lab1", nome: "Lab1" },
  { id: "lab2", nome: "Lab2" },
  { id: "lab3", nome: "Lab3" },
  { id: "lab-ciencias", nome: "Lab Ciências" },
  { id: "auditorio", nome: "Auditório" },
];

export const TURNOS = [
  { id: "manha", nome: "Manhã", horaPadrao: "07:20" },
  { id: "tarde", nome: "Tarde", horaPadrao: "13:00" },
];

export const MATERIAS = [
  "Matemática",
  "Português",
  "Ciências",
  "Física",
  "Química",
  "Biologia",
  "História",
  "Geografia",
  "Inglês",
  "Educação Física",
  "Arte",
  "Informática",
];

export const TURMAS = [
  { id: "1A", nome: "1A", serie: "1º ano do Ensino Médio", turno: "manha", maxAulas: 6 },
  { id: "1B", nome: "1B", serie: "1º ano do Ensino Médio", turno: "manha", maxAulas: 6 },
  { id: "2A", nome: "2A", serie: "2º ano do Ensino Médio", turno: "manha", maxAulas: 6 },
  { id: "2B", nome: "2B", serie: "2º ano do Ensino Médio", turno: "manha", maxAulas: 6 },
  { id: "3A", nome: "3A", serie: "3º ano do Ensino Médio", turno: "manha", maxAulas: 6 },
  { id: "3B", nome: "3B", serie: "3º ano do Ensino Médio", turno: "manha", maxAulas: 6 },
  { id: "6A", nome: "6A", serie: "6º ano do Ensino Fundamental", turno: "tarde", maxAulas: 5 },
  { id: "6B", nome: "6B", serie: "6º ano do Ensino Fundamental", turno: "tarde", maxAulas: 5 },
  { id: "7A", nome: "7A", serie: "7º ano do Ensino Fundamental", turno: "tarde", maxAulas: 5 },
  { id: "7B", nome: "7B", serie: "7º ano do Ensino Fundamental", turno: "tarde", maxAulas: 5 },
  { id: "8A", nome: "8A", serie: "8º ano do Ensino Fundamental", turno: "tarde", maxAulas: 5 },
  { id: "8B", nome: "8B", serie: "8º ano do Ensino Fundamental", turno: "tarde", maxAulas: 5 },
  { id: "9A", nome: "9A", serie: "9º ano do Ensino Fundamental", turno: "tarde", maxAulas: 5 },
  { id: "9B", nome: "9B", serie: "9º ano do Ensino Fundamental", turno: "tarde", maxAulas: 5 },
  {
    id: "1A-ADM",
    nome: "1A — Técnico em Administração",
    serie: "1º ano do Ensino Médio (Técnico)",
    turno: "tarde",
    maxAulas: 6,
  },
  {
    id: "1B-DS",
    nome: "1B — Técnico em Desenvolvimento de Sistemas",
    serie: "1º ano do Ensino Médio (Técnico)",
    turno: "tarde",
    maxAulas: 6,
  },
];

export const MINUTOS_POR_AULA = 50;
export const MINUTOS_RECREIO = 15;
export const RECREIO_APOS_AULA = 3;
export const MAX_AULAS = 6;
export const AULAS = Array.from({ length: MAX_AULAS }, (_, i) => i + 1);

const REGEX_DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function nomeLaboratorio(id) {
  return LABORATORIOS.find((l) => l.id === id)?.nome ?? "Laboratório";
}

export function nomeTurno(id) {
  return TURNOS.find((t) => t.id === id)?.nome ?? "Manhã";
}

export function paraMinutos(hora) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

export function paraHora(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function maxAulasParaTurma(id) {
  return TURMAS.find((t) => t.id === id)?.maxAulas ?? MAX_AULAS;
}

/** Minuto do dia em que a aula `numero` começa, já contando o recreio. */
export function horaAula(turno, numero) {
  const base = TURNOS.find((t) => t.id === turno)?.horaPadrao ?? "07:20";
  const recreio = numero > RECREIO_APOS_AULA ? MINUTOS_RECREIO : 0;
  return paraMinutos(base) + (numero - 1) * MINUTOS_POR_AULA + recreio;
}

export function aulasDaReserva(reserva) {
  if (!reserva || !Array.isArray(reserva.aulas)) return [];
  return [...reserva.aulas].sort((a, b) => a - b);
}

export function descreverAulas(reserva) {
  const aulas = aulasDaReserva(reserva);
  if (aulas.length === 0) return "Horário não informado";
  const nomes = aulas.map((n) => `${n}ª`);
  const lista = nomes.length === 1 ? nomes[0] : `${nomes.slice(0, -1).join(", ")} e ${nomes.at(-1)}`;
  const horarios = aulas.map((n) => paraHora(horaAula(reserva.turno, n))).join(", ");
  return `${lista} ${aulas.length === 1 ? "aula" : "aulas"} · início às ${horarios}`;
}

/** Procura uma reserva ativa que ocupe o mesmo laboratório/horário. */
export function haConflito(candidata, reservas, ignorarId) {
  return (
    reservas.find(
      (r) =>
        !r.cancelada &&
        r.id !== ignorarId &&
        r.labId === candidata.labId &&
        r.data === candidata.data &&
        r.turno === candidata.turno &&
        aulasDaReserva(r).some((aula) => candidata.aulas.includes(aula))
    ) ?? null
  );
}

export function ehDono(reserva, usuario) {
  if (!usuario || !reserva) return false;
  if (reserva.professorEmail) return reserva.professorEmail === usuario.email;
  return reserva.professor === usuario.nome;
}

export function cpfEhValido(valor) {
  const digitos = String(valor).replace(/\D/g, "");
  if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) return false;

  const calcularDigito = (pesoInicial) => {
    let soma = 0;
    for (let i = 0; i < pesoInicial - 1; i += 1) {
      soma += Number(digitos[i]) * (pesoInicial - i);
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  return calcularDigito(10) === Number(digitos[9]) && calcularDigito(11) === Number(digitos[10]);
}

export function emailEhValido(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(valor).trim());
}

export function dataEhValida(valor) {
  if (!REGEX_DATA_ISO.test(valor)) return false;
  const data = new Date(`${valor}T00:00:00`);
  return !Number.isNaN(data.getTime()) && valor === data.toISOString().slice(0, 10);
}

export function normalizarAulas(valor) {
  if (!Array.isArray(valor)) return [];
  const numeros = valor.map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= MAX_AULAS);
  return [...new Set(numeros)].sort((a, b) => a - b);
}

/**
 * Valida e normaliza uma reserva vinda da API.
 * Retorna `{ erro }` quando inválida ou `{ dados }` com os campos prontos para o banco.
 */
export function validarReserva(entrada = {}, { reservas = [], ignorarId = null } = {}) {
  const labId = String(entrada.labId ?? "");
  if (!LABORATORIOS.some((l) => l.id === labId)) {
    return { erro: "Laboratório inválido." };
  }

  const turno = String(entrada.turno ?? "");
  if (!TURNOS.some((t) => t.id === turno)) {
    return { erro: "Turno inválido." };
  }

  const data = String(entrada.data ?? "");
  if (!dataEhValida(data)) {
    return { erro: "Data inválida. Use o formato AAAA-MM-DD." };
  }

  const aulas = normalizarAulas(entrada.aulas);
  if (aulas.length === 0) {
    return { erro: "Selecione ao menos uma aula." };
  }

  const materia = String(entrada.materia ?? "").trim();
  if (materia.length < 2 || materia.length > 80) {
    return { erro: "Informe a matéria (entre 2 e 80 caracteres)." };
  }

  const turma = TURMAS.find((t) => t.id === entrada.turma && t.turno === turno);
  if (!turma) {
    return { erro: "Selecione uma turma válida para este turno." };
  }

  if (aulas.some((n) => n > turma.maxAulas)) {
    return { erro: `Esta turma tem até ${turma.maxAulas} aulas.` };
  }

  const candidata = { labId, turno, data, aulas };
  const conflito = haConflito(candidata, reservas, ignorarId);
  if (conflito) {
    return {
      erro: `Horário indisponível: o ${nomeLaboratorio(conflito.labId)} já possui uma reserva neste período.`,
      conflito: true,
    };
  }

  return {
    dados: {
      ...candidata,
      materia,
      turma: turma.id,
      turmaNome: turma.nome,
      serie: turma.serie,
    },
  };
}
