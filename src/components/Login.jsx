import { useState } from "react";
import { api } from "../api.js";
import { cpfEhValido, emailEhValido } from "../../shared/dominio.js";
import "../styles/Login.css";

export const CHAVE_SESSAO = "agendamento-lab-sessao";

function formatarCPF(valor) {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);
  return digitos
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export default function Login({ onLogin, aviso }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function entrar(evento) {
    evento.preventDefault();

    if (nome.trim().length < 2) {
      setErro("Informe seu nome.");
      return;
    }

    if (!emailEhValido(email)) {
      setErro("Informe um e-mail válido.");
      return;
    }

    if (!cpfEhValido(cpf)) {
      setErro("Informe um CPF válido.");
      return;
    }

    setErro("");
    setEnviando(true);

    try {
      const { usuario, token } = await api.login({ nome: nome.trim(), email: email.trim(), cpf });
      onLogin(usuario, token);
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-banner">
        <div className="login-marca">
          <span className="login-icone">🔬</span>
          <span>LabEscola</span>
        </div>
        <h1>Agendamentos CEPK</h1>
        <p>Reserve Lab1, Lab2, Lab3, Lab Ciências e Auditório de forma simples e organizada.</p>
        <div className="login-destaques">
          <span>✓ Reservas sem conflito</span>
          <span>✓ Dados salvos no banco</span>
          <span>✓ Funciona como aplicativo</span>
        </div>
      </section>

      <section className="login-lado">
        <form className="login-card" onSubmit={entrar}>
          <h2>Bem-vindo de volta</h2>
          <p className="login-subtitulo">Entre com seu nome, e-mail e CPF para continuar.</p>

          {aviso ? <p className="login-aviso">{aviso}</p> : null}

          <label>
            Nome do professor
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome completo"
              autoComplete="name"
              required
            />
          </label>

          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@escola.com.br"
              autoComplete="email"
              required
            />
          </label>

          <label>
            CPF
            <input
              type="text"
              value={cpf}
              onChange={(e) => setCpf(formatarCPF(e.target.value))}
              placeholder="000.000.000-00"
              inputMode="numeric"
              autoComplete="off"
              maxLength={14}
              required
            />
          </label>

          {erro ? <p className="login-erro">{erro}</p> : null}

          <button type="submit" disabled={enviando}>
            {enviando ? "Entrando…" : "Entrar"}
          </button>

          <p className="login-rodape">Acesso restrito a alunos e professores.</p>
        </form>
      </section>
    </div>
  );
}
