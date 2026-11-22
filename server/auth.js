import crypto from "node:crypto";

/**
 * Sessão assinada com HMAC-SHA256.
 * O token vai no cabeçalho `Authorization: Bearer <token>` e carrega apenas
 * nome/e-mail + validade — nenhum dado sensível fica exposto no navegador.
 */

const SEGREDO = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const VALIDADE_MS = 12 * 60 * 60 * 1000;

export const segredoEhTemporario = !process.env.SESSION_SECRET;

function assinar(payload) {
  return crypto.createHmac("sha256", SEGREDO).update(payload).digest("base64url");
}

export function criarToken(usuario) {
  const payload = Buffer.from(
    JSON.stringify({ sub: usuario.email, nome: usuario.nome, exp: Date.now() + VALIDADE_MS })
  ).toString("base64url");
  return `${payload}.${assinar(payload)}`;
}

export function verificarToken(token) {
  if (typeof token !== "string") return null;

  const [payload, assinatura] = token.split(".");
  if (!payload || !assinatura) return null;

  const esperada = Buffer.from(assinar(payload));
  const recebida = Buffer.from(assinatura);
  if (esperada.length !== recebida.length || !crypto.timingSafeEqual(esperada, recebida)) return null;

  try {
    const dados = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!dados?.sub || !dados?.exp || dados.exp < Date.now()) return null;
    return { nome: String(dados.nome ?? ""), email: String(dados.sub) };
  } catch {
    return null;
  }
}

export function exigirSessao(req, res, next) {
  const cabecalho = req.get("authorization") ?? "";
  const token = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7).trim() : "";
  const usuario = verificarToken(token);

  if (!usuario) {
    res.status(401).json({ erro: "Sessão expirada. Entre novamente." });
    return;
  }

  req.usuario = usuario;
  next();
}
