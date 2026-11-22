/**
 * Gera os ícones PNG do PWA (192, 512, maskable e apple-touch-icon)
 * sem depender de bibliotecas externas de imagem.
 *
 * Uso: npm run icones
 */
import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const SAIDA = path.join(RAIZ, "public", "icons");

const FUNDO = [22, 163, 74];
const BRANCO = [255, 255, 255];
const CLARO = [134, 239, 172];
const ESCURO = [22, 101, 52];

const AMOSTRAS = 3;

// ---------- geometria ----------
const dentroRetangulo = (x, y, x0, y0, x1, y1) => x >= x0 && x <= x1 && y >= y0 && y <= y1;

function dentroRetanguloArredondado(x, y, x0, y0, x1, y1, raio) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  if (x >= x0 + raio && x <= x1 - raio) return true;
  if (y >= y0 + raio && y <= y1 - raio) return true;
  const cx = x < x0 + raio ? x0 + raio : x1 - raio;
  const cy = y < y0 + raio ? y0 + raio : y1 - raio;
  return (x - cx) ** 2 + (y - cy) ** 2 <= raio ** 2;
}

const dentroCirculo = (x, y, cx, cy, raio) => (x - cx) ** 2 + (y - cy) ** 2 <= raio ** 2;

function dentroPoligono(x, y, pontos) {
  let dentro = false;
  for (let i = 0, j = pontos.length - 1; i < pontos.length; j = i++) {
    const [xi, yi] = pontos[i];
    const [xj, yj] = pontos[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      dentro = !dentro;
    }
  }
  return dentro;
}

// ---------- desenho ----------
const CORPO = [
  [0.4, 0.4],
  [0.6, 0.4],
  [0.78, 0.8],
  [0.22, 0.8],
];

function desenhar(tamanho, { mascara = false, escalaFrasco = 1 } = {}) {
  const lado = tamanho * AMOSTRAS;
  const alta = new Float32Array(lado * lado * 4);

  for (let py = 0; py < lado; py += 1) {
    for (let px = 0; px < lado; px += 1) {
      const x = (px + 0.5) / lado;
      const y = (py + 0.5) / lado;

      let cor = null;
      if (mascara || dentroRetanguloArredondado(x, y, 0, 0, 1, 1, 0.22)) {
        cor = FUNDO;
      }
      if (!cor) continue;

      const u = (x - 0.5) / escalaFrasco + 0.5;
      const v = (y - 0.5) / escalaFrasco + 0.5;
      const noFrasco =
        dentroPoligono(u, v, CORPO) ||
        dentroRetanguloArredondado(u, v, 0.22, 0.72, 0.78, 0.86, 0.06) ||
        dentroRetangulo(u, v, 0.4, 0.2, 0.6, 0.44);

      if (noFrasco) cor = BRANCO;
      if (dentroRetangulo(u, v, 0.365, 0.145, 0.635, 0.215)) cor = ESCURO;

      if (noFrasco && v >= 0.64) cor = CLARO;
      if (dentroCirculo(u, v, 0.36, 0.74, 0.035) || dentroCirculo(u, v, 0.52, 0.68, 0.022)) cor = FUNDO;

      const indice = (py * lado + px) * 4;
      alta[indice] = cor[0];
      alta[indice + 1] = cor[1];
      alta[indice + 2] = cor[2];
      alta[indice + 3] = 255;
    }
  }

  // reduz a imagem com média (antialiasing)
  const saida = Buffer.alloc(tamanho * tamanho * 4);
  for (let y = 0; y < tamanho; y += 1) {
    for (let x = 0; x < tamanho; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let dy = 0; dy < AMOSTRAS; dy += 1) {
        for (let dx = 0; dx < AMOSTRAS; dx += 1) {
          const indice = ((y * AMOSTRAS + dy) * lado + (x * AMOSTRAS + dx)) * 4;
          const alfa = alta[indice + 3] / 255;
          r += alta[indice] * alfa;
          g += alta[indice + 1] * alfa;
          b += alta[indice + 2] * alfa;
          a += alfa;
        }
      }
      const total = AMOSTRAS * AMOSTRAS;
      const destino = (y * tamanho + x) * 4;
      const alfaFinal = a / total;
      saida[destino] = alfaFinal > 0 ? Math.round(r / a) : 0;
      saida[destino + 1] = alfaFinal > 0 ? Math.round(g / a) : 0;
      saida[destino + 2] = alfaFinal > 0 ? Math.round(b / a) : 0;
      saida[destino + 3] = Math.round(alfaFinal * 255);
    }
  }
  return saida;
}

// ---------- PNG ----------
const TABELA_CRC = (() => {
  const tabela = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    tabela[n] = c >>> 0;
  }
  return tabela;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = TABELA_CRC[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function bloco(tipo, dados) {
  const tamanho = Buffer.alloc(4);
  tamanho.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo, "ascii"), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([tamanho, corpo, crc]);
}

function codificarPNG(largura, altura, rgba) {
  const assinatura = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8; // 8 bits por canal
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const linhas = Buffer.alloc((largura * 4 + 1) * altura);
  for (let y = 0; y < altura; y += 1) {
    const origem = y * largura * 4;
    const destino = y * (largura * 4 + 1);
    linhas[destino] = 0; // filtro "None"
    rgba.copy(linhas, destino + 1, origem, origem + largura * 4);
  }

  const idat = zlib.deflateSync(linhas, { level: 9 });
  return Buffer.concat([assinatura, bloco("IHDR", ihdr), bloco("IDAT", idat), bloco("IEND", Buffer.alloc(0))]);
}

// ---------- saída ----------
await fs.mkdir(SAIDA, { recursive: true });

const arquivos = [
  { nome: "icon-192.png", tamanho: 192, opcoes: {} },
  { nome: "icon-512.png", tamanho: 512, opcoes: {} },
  { nome: "maskable-512.png", tamanho: 512, opcoes: { mascara: true, escalaFrasco: 0.78 } },
  { nome: "apple-touch-icon.png", tamanho: 180, opcoes: {} },
];

for (const arquivo of arquivos) {
  const rgba = desenhar(arquivo.tamanho, arquivo.opcoes);
  const png = codificarPNG(arquivo.tamanho, arquivo.tamanho, rgba);
  await fs.writeFile(path.join(SAIDA, arquivo.nome), png);
  console.log(`${arquivo.nome} — ${(png.length / 1024).toFixed(1)} kB`);
}
