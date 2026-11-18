import { useEffect, useMemo, useState } from "react";
import Login, { CHAVE_SESSAO } from "./Login.jsx";
import "./App.css";

const LABORATORIOS = [
  { id: "lab1", nome: "Lab1" },
  { id: "lab2", nome: "Lab2" },
  { id: "lab3", nome: "Lab3" },
  { id: "lab-ciencias", nome: "Lab Ciências" },
  { id: "auditorio", nome: "Auditório" },
];

const TURNOS = [
  { id: "manha", nome: "Manhã", horaPadrao: "07:20" },
  { id: "tarde", nome: "Tarde", horaPadrao: "13:00" },
];

const MATERIAS = [
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

const TURMAS = [
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

const IDS_ANTIGOS = {
  "lab-informatica-1": "lab1",
  "lab-informatica-2": "lab2",
  "lab-quimica": "lab3",
  "lab-fisica": "lab-ciencias",
};

const MINUTOS_POR_AULA = 50;
const MINUTOS_RECREIO = 15;
const RECREIO_APOS_AULA = 3;
const MAX_AULAS = 6;
const AULAS = Array.from({ length: MAX_AULAS }, (_, i) => i + 1);
const CHAVE_RESERVAS = "agendamento-lab-reservas";

function isoLocal(d) {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function hojeISO() {
  return isoLocal(new Date());
}

function adicionarDias(iso, quantidade) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + quantidade);
  return isoLocal(d);
}

function inicioDaSemana(iso) {
  const d = new Date(`${iso}T00:00:00`);
  const deslocamento = d.getDay() === 0 ? 6 : d.getDay() - 1;
  return adicionarDias(iso, -deslocamento);
}

function diaUtil(iso) {
  const dia = new Date(`${iso}T00:00:00`).getDay();
  if (dia === 6) return adicionarDias(iso, 2);
  if (dia === 0) return adicionarDias(iso, 1);
  return iso;
}

function diaSemanaCurto(iso) {
  return new Date(`${iso}T00:00:00`)
    .toLocaleDateString("pt-BR", { weekday: "short" })
    .replace(".", "");
}

function rotuloSemana(primeiro, ultimo) {
  const inicio = new Date(`${primeiro}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  const fim = new Date(`${ultimo}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  return `${inicio} a ${fim}`;
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

function maxAulasParaTurma(id) {
  return TURMAS.find((t) => t.id === id)?.maxAulas ?? MAX_AULAS;
}

function horaAula(turno, numero) {
  const base = TURNOS.find((t) => t.id === turno)?.horaPadrao ?? "07:20";
  const recreio = numero > RECREIO_APOS_AULA ? MINUTOS_RECREIO : 0;
  return paraMinutos(base) + (numero - 1) * MINUTOS_POR_AULA + recreio;
}

function aulasDaReserva(r) {
  if (Array.isArray(r.aulas) && r.aulas.length > 0) return r.aulas;
  if (typeof r.inicioMin !== "number") return [];
  const duracao = r.duracaoMin || MINUTOS_POR_AULA;
  return AULAS.filter((n) => {
    const inicio = horaAula(r.turno, n);
    return r.inicioMin < inicio + MINUTOS_POR_AULA && r.inicioMin + duracao > inicio;
  });
}

function descreverAulas(r) {
  const aulas = aulasDaReserva(r);
  if (aulas.length === 0) return "Horário não informado";
  const nomes = aulas.map((n) => `${n}ª`);
  const lista = nomes.length === 1 ? nomes[0] : `${nomes.slice(0, -1).join(", ")} e ${nomes.at(-1)}`;
  const horarios = aulas.map((n) => paraHora(horaAula(r.turno, n))).join(", ");
  return `${lista} ${aulas.length === 1 ? "aula" : "aulas"} · início às ${horarios}`;
}

function haConflito(candidata, reservas, ignorarId) {
  return reservas.find(
    (r) =>
      !r.cancelada &&
      r.id !== ignorarId &&
      r.labId === candidata.labId &&
      r.data === candidata.data &&
      r.turno === candidata.turno &&
      aulasDaReserva(r).some((aula) => candidata.aulas.includes(aula))
  );
}

function ehDono(r, usuario) {
  if (!usuario || !r) return false;
  if (r.professorEmail) return r.professorEmail === usuario.email;
  return r.professor === usuario.nome;
}

function carregarReservas() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_RESERVAS));
    return Array.isArray(salvo)
      ? salvo.map((r) => ({
          ...r,
          labId: IDS_ANTIGOS[r.labId] ?? r.labId,
          turno: r.turno ?? (r.inicioMin < 12 * 60 ? "manha" : "tarde"),
          professor: r.professor ?? r.usuario ?? "",
          professorEmail: r.professorEmail ?? "",
          aulas: aulasDaReserva(r),
          duracaoMin:
            Math.max(1, Math.round((r.duracaoMin || MINUTOS_POR_AULA) / MINUTOS_POR_AULA)) * MINUTOS_POR_AULA,
        }))
      : [];
  } catch {
    return [];
  }
}

function carregarUsuario() {
  try {
    const salvo = JSON.parse(sessionStorage.getItem(CHAVE_SESSAO));
    if (salvo && typeof salvo === "object") {
      return { nome: salvo.nome || "", email: salvo.email || "" };
    }
    return { nome: "", email: salvo || "" };
  } catch {
    const salvo = sessionStorage.getItem(CHAVE_SESSAO) || "";
    return { nome: "", email: salvo };
  }
}

export default function App() {
  const [usuario, setUsuario] = useState(carregarUsuario);
  const [reservas, setReservas] = useState(carregarReservas);
  const [labId, setLabId] = useState(LABORATORIOS[0].id);
  const [turno, setTurno] = useState(TURNOS[0].id);
  const [filtroTurno, setFiltroTurno] = useState("todos");
  const [data, setData] = useState(hojeISO());
  const [aulasSelecionadas, setAulasSelecionadas] = useState([]);
  const [materia, setMateria] = useState("");
  const [turma, setTurma] = useState("");
  const [editandoId, setEditandoId] = useState("");
  const [pagina, setPagina] = useState("agendamento");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    localStorage.setItem(CHAVE_RESERVAS, JSON.stringify(reservas));
  }, [reservas]);

  const reservaAtual = useMemo(
    () => ({
      labId,
      turno,
      data,
      aulas: aulasSelecionadas,
    }),
    [labId, turno, data, aulasSelecionadas]
  );

  const conflitoAtual = useMemo(
    () => haConflito(reservaAtual, reservas, editandoId) || null,
    [reservas, reservaAtual, editandoId]
  );
  const limiteAulas = maxAulasParaTurma(turma);

  const semana = useMemo(() => {
    const inicio = inicioDaSemana(data);
    return Array.from({ length: 5 }, (_, i) => adicionarDias(inicio, i));
  }, [data]);

  const reservasPorDia = useMemo(
    () =>
      reservas.reduce((acc, r) => {
        if (!r.cancelada) acc[r.data] = (acc[r.data] || 0) + 1;
        return acc;
      }, {}),
    [reservas]
  );

  const listaReservas = useMemo(
    () =>
      [...reservas]
        .filter((r) => !r.cancelada && (filtroTurno === "todos" || r.turno === filtroTurno))
        .sort(
          (a, b) =>
            (a.data === b.data ? Math.min(...aulasDaReserva(a)) - Math.min(...aulasDaReserva(b)) : a.data.localeCompare(b.data))
        ),
    [reservas, filtroTurno]
  );

  function limparFormulario() {
    setLabId(LABORATORIOS[0].id);
    setTurno(TURNOS[0].id);
    setData(hojeISO());
    setAulasSelecionadas([]);
    setMateria("");
    setTurma("");
    setEditandoId("");
    setErro("");
  }

  function irParaAgendamento() {
    limparFormulario();
    setMensagem("");
    setPagina("agendamento");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function irParaResultado() {
    setPagina("resultado");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function salvar(evento) {
    evento.preventDefault();

    if (aulasSelecionadas.length === 0) {
      setErro("Selecione ao menos uma aula.");
      return;
    }

    if (!materia.trim()) {
      setErro("Informe a matéria da aula.");
      return;
    }

    const turmaSelecionada = TURMAS.find((t) => t.id === turma && t.turno === reservaAtual.turno);
    if (!turmaSelecionada) {
      setErro("Selecione a turma do agendamento.");
      return;
    }

    if (aulasSelecionadas.some((n) => n > turmaSelecionada.maxAulas)) {
      setErro(`Esta turma tem até ${turmaSelecionada.maxAulas} aulas.`);
      return;
    }

    const conflito = haConflito(reservaAtual, reservas, editandoId);
    if (conflito) {
      setErro(
        `Horário indisponível: o ${LABORATORIOS.find((l) => l.id === conflito.labId)?.nome ?? "laboratório"} já possui uma reserva neste período.`
      );
      return;
    }

    const dados = {
      labId: reservaAtual.labId,
      turno: reservaAtual.turno,
      data: reservaAtual.data,
      aulas: [...aulasSelecionadas].sort((a, b) => a - b),
      materia: materia.trim(),
      turma: turmaSelecionada.id,
      turmaNome: turmaSelecionada.nome,
      serie: turmaSelecionada.serie,
    };

    if (editandoId) {
      const original = reservas.find((r) => r.id === editandoId);
      if (!original || !ehDono(original, usuario)) {
        setErro("Você não tem permissão para editar este agendamento.");
        return;
      }
      setReservas(reservas.map((r) => (r.id === editandoId ? { ...r, ...dados } : r)));
    } else {
      setReservas([
        ...reservas,
        {
          id: crypto.randomUUID(),
          ...dados,
          professor: usuario.nome,
          professorEmail: usuario.email,
        },
      ]);
    }

    setMensagem(editandoId ? "Reserva atualizada com sucesso!" : "Reserva agendada com sucesso!");
    limparFormulario();
    setPagina("resultado");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelar(id) {
    const reserva = reservas.find((r) => r.id === id);
    if (!ehDono(reserva, usuario)) {
      setErro("Você não tem permissão para cancelar este agendamento.");
      return;
    }
    setReservas(reservas.filter((r) => r.id !== id));
    if (editandoId === id) limparFormulario();
    setMensagem("Reserva cancelada.");
    setErro("");
  }

  function editar(r) {
    if (!ehDono(r, usuario)) {
      setErro("Você não tem permissão para editar este agendamento.");
      return;
    }
    setEditandoId(r.id);
    setLabId(r.labId);
    setTurno(r.turno);
    setData(r.data);
    setAulasSelecionadas(aulasDaReserva(r));
    setTurma(r.turma || "");
    setMateria(r.materia || "");
    setErro("");
    setMensagem("");
    setPagina("agendamento");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const nomeLaboratorio = (id) => LABORATORIOS.find((l) => l.id === id)?.nome ?? "Laboratório";
  const nomeTurno = (id) => TURNOS.find((t) => t.id === id)?.nome ?? "Manhã";

  function trocarTurno(id) {
    setTurno(id);
    setTurma("");
    setAulasSelecionadas([]);
  }

  function alternarAula(numero) {
    setErro("");
    setAulasSelecionadas((atuais) =>
      atuais.includes(numero) ? atuais.filter((n) => n !== numero) : [...atuais, numero].sort((a, b) => a - b)
    );
  }

  function trocarTurma(id) {
    setTurma(id);
    const limite = maxAulasParaTurma(id);
    setAulasSelecionadas((atuais) => atuais.filter((n) => n <= limite));
    setErro("");
  }

  function cancelarEdicao() {
    limparFormulario();
    irParaResultado();
  }

  function entrar(dados) {
    setUsuario(dados);
    limparFormulario();
    setPagina("agendamento");
  }

  function sair() {
    sessionStorage.removeItem(CHAVE_SESSAO);
    setUsuario("");
    limparFormulario();
    setPagina("login");
  }

  if (!usuario || pagina === "login") {
    return <Login onLogin={entrar} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Agendamentos CEPK</h1>
        <p>Sistema de reservas para laboratórios da escola</p>
        <div className="sessao">
          <span className="usuario" title={usuario.email || usuario.nome}>
            👤 {usuario.nome || usuario.email}
          </span>
          <button className="btn-sair" onClick={sair}>
            Sair
          </button>
        </div>
        <nav className="etapas" aria-label="Etapas">
          <span className="etapa concluida">1 · Login</span>
          <button
            type="button"
            className={`etapa${pagina === "agendamento" ? " ativa" : ""}`}
            onClick={irParaAgendamento}
          >
            2 · Agendamento
          </button>
          <button
            type="button"
            className={`etapa${pagina === "resultado" ? " ativa" : ""}`}
            onClick={irParaResultado}
          >
            3 · Resultado
          </button>
        </nav>
      </header>

      <main>
        {pagina === "agendamento" ? (
        <section className="card">
          <h2>{editandoId ? "Editar reserva" : "Nova reserva"}</h2>
          <form className="form-grid" onSubmit={salvar}>
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
              Turno
              <select value={turno} onChange={(e) => trocarTurno(e.target.value)}>
                {TURNOS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Turma
              <select value={turma} onChange={(e) => trocarTurma(e.target.value)} required>
                <option value="">Selecione a turma</option>
                {TURMAS.filter((t) => t.turno === turno).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome} · {t.serie}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="calendario">
              <legend>Data</legend>
              <div className="calendario-nav">
                <button
                  type="button"
                  aria-label="Semana anterior"
                  disabled={semana[0] <= inicioDaSemana(hojeISO())}
                  onClick={() => setData(adicionarDias(semana[0], -7))}
                >
                  ‹
                </button>
                <span>{rotuloSemana(semana[0], semana[4])}</span>
                <button
                  type="button"
                  aria-label="Próxima semana"
                  onClick={() => setData(adicionarDias(semana[0], 7))}
                >
                  ›
                </button>
              </div>
              <div className="calendario-dias">
                {semana.map((iso) => {
                  const quantidade = reservasPorDia[iso] || 0;
                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={iso < hojeISO()}
                      className={`calendario-dia${data === iso ? " selecionado" : ""}${quantidade ? " com-reserva" : ""}`}
                      onClick={() => setData(iso)}
                      title={`${quantidade} ${quantidade === 1 ? "reserva" : "reservas"} neste dia`}
                    >
                      <small>{diaSemanaCurto(iso)}</small>
                      <strong>{Number(iso.slice(-2))}</strong>
                      {quantidade ? <span className="calendario-badge">{quantidade}</span> : null}
                    </button>
                  );
                })}
              </div>
              <div className="calendario-rodape">
                <button type="button" className="calendario-hoje" onClick={() => setData(diaUtil(hojeISO()))}>
                  Hoje
                </button>
                <label className="calendario-outra">
                  Outra data
                  <input type="date" value={data} min={hojeISO()} onChange={(e) => setData(diaUtil(e.target.value))} />
                </label>
              </div>
            </fieldset>

            <fieldset className="aulas-fieldset">
              <legend>Aulas</legend>
              <p className="aulas-dica">
                Selecione uma ou mais aulas. Recreio de 15 min após a 3ª aula.
                {turma ? ` Esta turma tem até ${limiteAulas} aulas.` : ""}
              </p>
              <div className="aulas-opcoes">
                {AULAS.map((n) => {
                  const selecionada = aulasSelecionadas.includes(n);
                  const indisponivel = n > limiteAulas;
                  return (
                    <label
                      key={n}
                      className={`aula-opcao${selecionada ? " selecionada" : ""}${indisponivel ? " indisponivel" : ""}`}
                      title={indisponivel ? "Esta turma não tem esta aula" : undefined}
                    >
                      <input
                        type="checkbox"
                        checked={selecionada}
                        disabled={indisponivel}
                        onChange={() => alternarAula(n)}
                      />
                      <span>
                        <strong>{n}ª aula</strong>
                        <small>
                          {paraHora(horaAula(turno, n))} – {paraHora(horaAula(turno, n) + MINUTOS_POR_AULA)}
                        </small>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <label>
              Matéria
              <input
                type="text"
                list="materias"
                value={materia}
                onChange={(e) => setMateria(e.target.value)}
                placeholder="Ex.: Física"
                required
              />
              <datalist id="materias">
                {MATERIAS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </label>

            {conflitoAtual ? (
              <p className="aviso">⚠️ Já existe uma reserva para este laboratório neste horário.</p>
            ) : null}

            {erro ? <p className="erro">{erro}</p> : null}

            <div className="form-acoes">
              <button type="submit">{editandoId ? "Salvar alterações" : "Agendar"}</button>
              {editandoId ? (
                <button type="button" className="btn-secundario" onClick={cancelarEdicao}>
                  Cancelar edição
                </button>
              ) : null}
            </div>
          </form>
        </section>
        ) : (
        <section className="card">
          <div className="reservas-cabecalho">
            <h2>Resultado dos agendamentos</h2>
            <div className="filtros-turno">
              {[{ id: "todos", nome: "Todos" }, ...TURNOS].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={filtroTurno === t.id ? "ativo" : ""}
                  onClick={() => setFiltroTurno(t.id)}
                >
                  {t.nome}
                </button>
              ))}
            </div>
            <button type="button" className="btn-secundario" onClick={irParaAgendamento}>
              + Novo agendamento
            </button>
          </div>
          {mensagem ? <p className="sucesso">✅ {mensagem}</p> : null}
          {listaReservas.length === 0 ? (
            <p className="vazio">Nenhuma reserva cadastrada.</p>
          ) : (
            <ul className="lista-reservas">
              {listaReservas.map((r) => (
                <li key={r.id}>
                  <div className="info">
                    <div className="info-titulo">
                      <strong>{nomeLaboratorio(r.labId)}</strong>
                      <span className={`turno turno-${r.turno}`}>{nomeTurno(r.turno)}</span>
                    </div>
                    <span>{formatarData(r.data)}</span>
                    <span>{descreverAulas(r)}</span>
                    {r.turmaNome || r.turma ? (
                      <span className="reserva-turma">
                        🎓 {r.turmaNome || r.turma}
                        {r.serie ? ` · ${r.serie}` : ""}
                      </span>
                    ) : null}
                    <span className="reserva-responsavel">
                      👤 {r.professor || "Professor não informado"} · 📚 {r.materia || "Matéria não informada"}
                    </span>
                  </div>
                  <div className="acoes-reserva">
                    {ehDono(r, usuario) ? (
                      <>
                        <button type="button" className="btn-editar" onClick={() => editar(r)}>
                          Editar
                        </button>
                        <button type="button" className="btn-cancelar" onClick={() => cancelar(r.id)}>
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <span className="somente-leitura">Somente o professor responsável pode editar</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        )}
      </main>
    </div>
  );
}
