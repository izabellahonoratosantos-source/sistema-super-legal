import { useState } from "react";
import "./Login.css";

export const CHAVE_SESSAO = "agendamento-lab-sessao";

const TESTE_EMAIL = "teste@escola.com.br";
const TESTE_CPF = "529.982.247-25";
const TESTE_NOME = "Professora Maria Silva";

function formatarCPF(valor) {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);
  return digitos
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function cpfEhValido(valor) {
  const digitos = valor.replace(/\D/g, "");
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

function emailEhValido(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim());
}

export default function Login({ onLogin }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [erro, setErro] = useState("");

  function preencherTeste() {
    setNome(TESTE_NOME);
    setEmail(TESTE_EMAIL);
    setCpf(TESTE_CPF);
    setErro("");
  }

  function entrar(evento) {
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

    const usuario = { nome: nome.trim(), email: email.trim() };
    sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(usuario));
    setErro("");
    onLogin(usuario);
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
          <span>✓ Acesso rápido</span>
          <span>✓ Tudo em um só lugar</span>
        </div>
      </section>

      <section className="login-lado">
        <form className="login-card" onSubmit={entrar}>
          <h2>Bem-vindo de volta</h2>
          <p className="login-subtitulo">Entre com seu nome, e-mail e CPF para continuar.</p>

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

          <button type="submit">Entrar</button>

          <div className="login-teste">
            <div className="login-teste-dados">
              <strong>Conta para teste</strong>
              <span>{TESTE_NOME}</span>
              <span>{TESTE_EMAIL}</span>
              <span>{TESTE_CPF}</span>
            </div>
            <button type="button" className="btn-teste" onClick={preencherTeste}>
              Preencher
            </button>
          </div>

          <p className="login-rodape">Acesso restrito a alunos e professores.</p>
        </form>
      </section>
    </div>
  );
}
