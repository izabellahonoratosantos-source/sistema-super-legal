# Sistema Super Legal — Agendamentos CEPK

Sistema web de agendamento de laboratórios para a escola, com login de professores, calendário semanal, controle de conflitos de horário e visualização/edição das reservas.

## Funcionalidades

- Login com nome, e-mail e CPF (validação de CPF no cliente)
- Fluxo em três etapas: login → agendamento → resultado
- Reservas de laboratório por data, turno e aulas
- Turnos da manhã (07:20 às 12:35) e da tarde (13:00 às 18:15)
- Aulas de 50 minutos, com recreio de 15 minutos após a 3ª aula
- Seleção de turma, matéria e professor responsável
- Bloqueio automático de conflitos de horário
- Edição e cancelamento restritos ao professor que criou a reserva
- Calendário semanal com atalho “Hoje” e indicador de dias com reservas
- Persistência local via `localStorage` e sessão via `sessionStorage`

## Tecnologias

- [React 19](https://react.dev/)
- [Vite 8](https://vite.dev/)
- CSS puro
- [Oxlint](https://oxc.rs/docs/guide/usage/linter.html)

## Estrutura do projeto

```
sistema-super-legal/
├─ public/
│  └─ favicon.svg
├─ src/
│  ├─ components/
│  │  ├─ App.jsx        # telas de agendamento e resultado
│  │  └─ Login.jsx      # tela de login
│  ├─ styles/
│  │  ├─ index.css      # estilos globais
│  │  ├─ App.css        # estilos do app
│  │  └─ Login.css      # estilos da tela de login
│  ├─ main.jsx          # ponto de entrada
│  └─ ...
├─ index.html
├─ package.json
├─ vite.config.js
├─ render.yaml          # blueprint de deploy no Render
└─ README.md
```

## Como executar

```bash
npm install
npm run dev
```

Abra o endereço exibido pelo Vite (normalmente `http://localhost:5173`).

### Login de teste

| Campo | Valor |
|---|---|
| Nome | Professora Maria Silva |
| E-mail | teste@escola.com.br |
| CPF | 529.982.247-25 |

O botão **Preencher** na tela de login preenche esses dados automaticamente.

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera a versão de produção em `dist/` |
| `npm run preview` | Pré-visualiza o build de produção |
| `npm run lint` | Executa o Oxlint |

## Deploy no Render

O arquivo `render.yaml` já configura um **Static Site**:

- **Build Command:** `npm ci && npm run build`
- **Publish Directory:** `dist`
- **Tipo:** estático (`env: static`)

Para publicar:

1. Acesse [render.com](https://render.com) e conecte o repositório.
2. **New + → Static Site** (ou **Blueprint**, que lê o `render.yaml`).
3. Confirme o build e o diretório de publicação.
4. A página fica disponível em `https://<nome-do-servico>.onrender.com`.
