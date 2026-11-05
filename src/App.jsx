import { useEffect, useMemo, useState } from "react";
import "./App.css";

const LABORATORIOS = [
  { id: "lab-informatica-1", nome: "Laboratório de Informática 1" },
  { id: "lab-informatica-2", nome: "Laboratório de Informática 2" },
  { id: "lab-quimica", nome: "Laboratório de Química" },
  { id: "lab-fisica", nome: "Laboratório de Física" },
];

const DURACAO_PADRAO = 60;
const CHAVE_RESERVAS = "agendamento-lab-reservas";

function hojeISO() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function paraMinutos(hora) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

function paraHora(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatarData(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function carregarReservas() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_RESERVAS));
    return Array.isArray(salvo) ? salvo : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [reservas, setReservas] = useState(carregarReservas);
  const [labId, setLabId] = useState(LABORATORIOS[0].id);
  const [data, setData] = useState(hojeISO());
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [duracao, setDuracao] = useState(DURACAO_PADRAO);
  const [erro, setErro] = useState("");

  useEffect(() => {
    localStorage.setItem(CHAVE_RESERVAS, JSON.stringify(reservas));
  }, [reservas]);

  const reservaAtual = {
    labId,
    data,
    inicioMin: paraMinutos(horaInicio),
    duracaoMin: Number(duracao) || DURACAO_PADRAO,
  };

  const conflitoAtual = useMemo(() => {
    const inicio = reservaAtual.inicioMin;
    const fim = inicio + reservaAtual.duracaoMin;
    return (
      reservas.find(
        (r) =>
          !r.cancelada &&
          r.labId === reservaAtual.labId &&
          r.data === reservaAtual.data &&
          inicio < r.inicioMin + r.duracaoMin &&
          fim > r.inicioMin
      ) || null
    );
  }, [reservas, reservaAtual]);

  const listaReservas = useMemo(
    () =>
      [...reservas]
        .filter((r) => !r.cancelada)
        .sort((a, b) => (a.data === b.data ? a.inicioMin - b.inicioMin : a.data.localeCompare(b.data))),
    [reservas]
  );

  function agendar(evento) {
    evento.preventDefault();
    const fimMin = reservaAtual.inicioMin + reservaAtual.duracaoMin;

    if (fimMin > 24 * 60) {
      setErro("A reserva não pode ultrapassar 24:00.");
      return;
    }

    const conflito = reservas.find(
      (r) =>
        !r.cancelada &&
        r.labId === reservaAtual.labId &&
        r.data === reservaAtual.data &&
        reservaAtual.inicioMin < r.inicioMin + r.duracaoMin &&
        fimMin > r.inicioMin
    );

    if (conflito) {
      setErro(
        `Horário indisponível: o ${LABORATORIOS.find((l) => l.id === conflito.labId)?.nome ?? "laboratório"} já possui uma reserva neste período.`
      );
      return;
    }

    setReservas([
      ...reservas,
      {
        id: crypto.randomUUID(),
        labId: reservaAtual.labId,
        data: reservaAtual.data,
        inicioMin: reservaAtual.inicioMin,
        duracaoMin: reservaAtual.duracaoMin,
      },
    ]);
    setErro("");
  }

  function cancelar(id) {
    setReservas(reservas.filter((r) => r.id !== id));
  }

  const nomeLaboratorio = (id) => LABORATORIOS.find((l) => l.id === id)?.nome ?? "Laboratório";

  return (
    <div className="app">
      <header className="app-header">
        <h1>🔬 Agendamento de Laboratório</h1>
        <p>Sistema de reservas para laboratórios da escola</p>
      </header>

      <main>
        <section className="card">
          <h2>Nova reserva</h2>
          <form className="form-grid" onSubmit={agendar}>
            <label>
              Laboratório
              <select value={labId} onChange={(e) => setLabId(e.target.value)}>
                {LABORATORIOS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Data
              <input type="date" value={data} min={hojeISO()} onChange={(e) => setData(e.target.value)} required />
            </label>

            <label>
              Início
              <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} required />
            </label>

            <label>
              Duração (minutos)
              <input
                type="number"
                min={15}
                max={480}
                step={15}
                value={duracao}
                onChange={(e) => setDuracao(Number(e.target.value))}
                required
              />
            </label>

            {conflitoAtual ? (
              <p className="aviso">⚠️ Já existe uma reserva para este laboratório neste horário.</p>
            ) : null}

            {erro ? <p className="erro">{erro}</p> : null}

            <button type="submit">Agendar</button>
          </form>
        </section>

        <section className="card">
          <h2>Reservas</h2>
          {listaReservas.length === 0 ? (
            <p className="vazio">Nenhuma reserva cadastrada.</p>
          ) : (
            <ul className="lista-reservas">
              {listaReservas.map((r) => (
                <li key={r.id}>
                  <div className="info">
                    <strong>{nomeLaboratorio(r.labId)}</strong>
                    <span>{formatarData(r.data)}</span>
                    <span>
                      {paraHora(r.inicioMin)} – {paraHora(r.inicioMin + r.duracaoMin)} · {r.duracaoMin} min
                    </span>
                  </div>
                  <button className="btn-cancelar" onClick={() => cancelar(r.id)}>
                    Cancelar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
