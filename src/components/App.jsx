import { useCallback, useEffect, useMemo, useState } from "react";
import Login, { CHAVE_SESSAO } from "./Login.jsx";
import { api, definirToken, limparToken } from "../api.js";
import { useInstalacao } from "../hooks/useInstalacao.js";
import { useOnline } from "../hooks/useOnline.js";
import {
  adicionarDias,
  diaSemanaCurto,
  diaUtil,
  formatarData,
  hojeISO,
  inicioDaSemana,
  rotuloSemana,
} from "../utils/datas.js";
import {
  AULAS,
  LABORATORIOS,
  MATERIAS,
  MINUTOS_POR_AULA,
  MINUTOS_RECREIO,
  RECREIO_APOS_AULA,
  TURMAS,
  TURNOS,
  aulasDaReserva,
  descreverAulas,
  ehDono,
  haConflito,
  horaAula,
  maxAulasParaTurma,
  nomeLaboratorio,
  nomeTurno,
  paraHora,
  validarReserva,
} from "../../shared/dominio.js";
import "../styles/App.css";

function lerUsuarioSalvo() {
  try {
    const salvo = JSON.parse(sessionStorage.getItem(CHAVE_SESSAO));
    if (salvo && typeof salvo === "object" && salvo.email) {
      return { nome: salvo.nome || "", email: salvo.email };
    }
  } catch {
    /* sessão inválida: ignora */
  }
  return null;
}

export default function App() {
  const [usuario, setUsuario] = useState(lerUsuarioSalvo);
  const [avisoLogin, setAvisoLogin] = useState("");
  const [reservas, setReservas] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [labId, setLabId] = useState(LABORATORIOS[0].id);
  const [turno, setTurno] = useState(TURNOS[0].id);
  const [filtroTurno, setFiltroTurno] = useState("todos");
  const [data, setData] = useState(() => diaUtil(hojeISO()));
  const [aulasSelecionadas, setAulasSelecionadas] = useState([]);
  const [materia, setMateria] = useState("");
  const [turma, setTurma] = useState("");
  const [editandoId, setEditandoId] = useState("");
  const [pagina, setPagina] = useState(() =>
    new URLSearchParams(window.location.search).get("acao") === "lista" ? "resultado" : "agendamento"
  );
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  const online = useOnline();
  const { podeInstalar, instalado, instalar } = useInstalacao();

  const encerrarSessao = useCallback((motivo = "") => {
    limparToken();
    try {
      sessionStorage.removeItem(CHAVE_SESSAO);
    } catch {
      /* ignora */
    }
    // remove do cache offline os dados do usuário que saiu
    navigator.serviceWorker?.controller?.postMessage("LIMPAR_API");
    setUsuario(null);
    setReservas([]);
    setPagina("login");
    setAvisoLogin(motivo);
  }, []);

  const carregar = useCallback(async () => {
    // eslint-disable-next-line react/set-state-in-effect -- estado de carregamento da chamada assíncrona
    setCarregando(true);
    try {
      setReservas(await api.listarReservas());
      setErro("");
    } catch (falha) {
      if (falha.status === 401) {
        encerrarSessao(falha.message);
      } else {
        setErro(falha.message);
      }
    } finally {
      setCarregando(false);
    }
  }, [encerrarSessao]);

  useEffect(() => {
    if (usuario) carregar();
  }, [usuario, carregar]);

  const reservaAtual = useMemo(
    () => ({ labId, turno, data, aulas: aulasSelecionadas }),
    [labId, turno, data, aulasSelecionadas]
  );

  const conflitoAtual = useMemo(
    () => haConflito(reservaAtual, reservas, editandoId),
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
        .sort((a, b) =>
          a.data === b.data
            ? Math.min(...aulasDaReserva(a)) - Math.min(...aulasDaReserva(b))
            : a.data.localeCompare(b.data)
        ),
    [reservas, filtroTurno]
  );

  function limparFormulario() {
    setLabId(LABORATORIOS[0].id);
    setTurno(TURNOS[0].id);
    setData(diaUtil(hojeISO()));
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

  async function salvar(evento) {
    evento.preventDefault();

    if (data < hojeISO()) {
      setErro("Escolha uma data a partir de hoje.");
      return;
    }

    const { erro: erroValidacao, dados } = validarReserva(
      { labId, turno, data, aulas: aulasSelecionadas, materia, turma },
      { reservas, ignorarId: editandoId || null }
    );

    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }

    setErro("");
    setSalvando(true);

    try {
      if (editandoId) {
        await api.atualizarReserva(editandoId, dados);
        setMensagem("Reserva atualizada com sucesso!");
      } else {
        await api.criarReserva(dados);
        setMensagem("Reserva agendada com sucesso!");
      }

      await carregar();
      limparFormulario();
      setPagina("resultado");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (falha) {
      if (falha.status === 401) {
        encerrarSessao(falha.message);
        return;
      }
      setErro(falha.message);
    } finally {
      setSalvando(false);
    }
  }

  async function cancelar(id) {
    if (!window.confirm("Excluir este agendamento? Esta ação não pode ser desfeita.")) return;

    try {
      await api.excluirReserva(id);
      if (editandoId === id) limparFormulario();
      await carregar();
      setMensagem("Reserva excluída.");
      setErro("");
    } catch (falha) {
      if (falha.status === 401) {
        encerrarSessao(falha.message);
        return;
      }
      setErro(falha.message);
    }
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

  function entrar(dados, token) {
    definirToken(token);
    try {
      sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(dados));
    } catch {
      /* ignora */
    }
    setUsuario(dados);
    setAvisoLogin("");
    setPagina("agendamento");
    limparFormulario();
  }

  function sair() {
    encerrarSessao("");
  }

  if (!usuario) {
    return <Login onLogin={entrar} aviso={avisoLogin} />;
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
          {podeInstalar && !instalado ? (
            <button type="button" className="btn-instalar" onClick={instalar}>
              📲 Instalar app
            </button>
          ) : null}
          <button type="button" className="btn-sair" onClick={sair}>
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
        {!online ? (
          <p className="aviso offline" role="status">
            📴 Você está offline. Exibindo os dados salvos no aparelho.
          </p>
        ) : null}

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
                  <button type="button" aria-label="Próxima semana" onClick={() => setData(adicionarDias(semana[0], 7))}>
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
                  Selecione uma ou mais aulas. Recreio de {MINUTOS_RECREIO} min após a {RECREIO_APOS_AULA}ª aula.
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

              {erro ? (
                <p className="erro" role="alert">
                  {erro}
                </p>
              ) : null}

              <div className="form-acoes">
                <button type="submit" disabled={salvando}>
                  {salvando ? "Salvando…" : editandoId ? "Salvar alterações" : "Agendar"}
                </button>
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

            {mensagem ? (
              <p className="sucesso" role="status">
                ✅ {mensagem}
              </p>
            ) : null}
            {erro ? (
              <p className="erro" role="alert">
                {erro}
              </p>
            ) : null}

            {carregando && reservas.length === 0 ? (
              <p className="vazio">Carregando agendamentos…</p>
            ) : listaReservas.length === 0 ? (
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
                            Excluir
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

      <footer className="app-rodape">
        <span>LabEscola · aplicativo instalável (PWA)</span>
        <span>Dados salvos no banco de dados</span>
      </footer>
    </div>
  );
}
