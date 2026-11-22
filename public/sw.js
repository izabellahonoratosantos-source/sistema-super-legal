/* Service Worker do LabEscola — estratégias de cache para funcionar offline. */
const VERSAO = "v1";
const CACHE_ESTATICOS = `labescola-estaticos-${VERSAO}`;
const CACHE_API = `labescola-api-${VERSAO}`;

const PRECACHE = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.json",
  "/favicon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_ESTATICOS);
      await Promise.allSettled(PRECACHE.map((url) => cache.add(new Request(url, { cache: "reload" }))));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    (async () => {
      const nomes = await caches.keys();
      await Promise.all(
        nomes
          .filter((nome) => nome !== CACHE_ESTATICOS && nome !== CACHE_API)
          .map((nome) => caches.delete(nome))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (evento) => {
  if (evento.data === "PULAR_ESPERA") {
    self.skipWaiting();
  }
  if (evento.data === "LIMPAR_API") {
    caches.delete(CACHE_API);
  }
});

self.addEventListener("fetch", (evento) => {
  const { request } = evento;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/")) {
    evento.respondWith(apiPrimeiro(request));
    return;
  }

  if (request.mode === "navigate") {
    evento.respondWith(paginaPrimeiro(request));
    return;
  }

  evento.respondWith(estaticoPrimeiro(request));
});

/** API: rede primeiro; se falhar, devolve a última resposta salva. */
async function apiPrimeiro(request) {
  try {
    const resposta = await fetch(request);
    if (resposta.ok) {
      const cache = await caches.open(CACHE_API);
      cache.put(request, resposta.clone());
    }
    return resposta;
  } catch {
    const cache = await caches.open(CACHE_API);
    const salva = await cache.match(request);
    if (salva) return salva;

    return new Response(JSON.stringify({ erro: "Você está offline. Conecte-se para atualizar os dados." }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }
}

/** Navegação: rede primeiro; offline cai no index em cache. */
async function paginaPrimeiro(request) {
  try {
    const resposta = await fetch(request);
    if (resposta.ok) {
      const cache = await caches.open(CACHE_ESTATICOS);
      cache.put("/index.html", resposta.clone());
    }
    return resposta;
  } catch {
    const cache = await caches.open(CACHE_ESTATICOS);
    return (
      (await cache.match("/index.html")) ??
      (await cache.match("/offline.html")) ??
      new Response("Sem conexão.", { status: 503, headers: { "content-type": "text/plain" } })
    );
  }
}

/** Arquivos estáticos: responde do cache e atualiza em segundo plano. */
async function estaticoPrimeiro(request) {
  const cache = await caches.open(CACHE_ESTATICOS);
  const salva = await cache.match(request);

  const atualizacao = fetch(request)
    .then((resposta) => {
      if (resposta.ok) cache.put(request, resposta.clone());
      return resposta;
    })
    .catch(() => null);

  if (salva) return salva;

  const resposta = await atualizacao;
  if (resposta) return resposta;

  return new Response("Recurso indisponível offline.", {
    status: 503,
    headers: { "content-type": "text/plain" },
  });
}
