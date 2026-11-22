/** Utilitários de data usados apenas na interface (sempre no fuso local). */

export function isoLocal(data) {
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

export function hojeISO() {
  return isoLocal(new Date());
}

export function adicionarDias(iso, quantidade) {
  const data = new Date(`${iso}T00:00:00`);
  data.setDate(data.getDate() + quantidade);
  return isoLocal(data);
}

/** Segunda-feira da semana que contém a data. */
export function inicioDaSemana(iso) {
  const data = new Date(`${iso}T00:00:00`);
  const deslocamento = data.getDay() === 0 ? 6 : data.getDay() - 1;
  return adicionarDias(iso, -deslocamento);
}

/** Se cair no fim de semana, empurra para o próximo dia útil. */
export function diaUtil(iso) {
  const dia = new Date(`${iso}T00:00:00`).getDay();
  if (dia === 6) return adicionarDias(iso, 2);
  if (dia === 0) return adicionarDias(iso, 1);
  return iso;
}

export function diaSemanaCurto(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
}

export function rotuloSemana(primeiro, ultimo) {
  const inicio = new Date(`${primeiro}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  const fim = new Date(`${ultimo}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return `${inicio} a ${fim}`;
}

export function formatarData(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
