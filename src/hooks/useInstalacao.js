import { useEffect, useState } from "react";

/**
 * Controla o prompt nativo de instalação do PWA (Android/Chrome/Edge).
 * No iOS o Safari não dispara `beforeinstallprompt`; a interface mostra
 * instruções manuais nesse caso.
 */
export function useInstalacao() {
  const [evento, setEvento] = useState(null);
  const [instalado, setInstalado] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia?.("(display-mode: standalone)").matches ?? false : false
  );

  useEffect(() => {
    function aoPoderInstalar(e) {
      e.preventDefault();
      setEvento(e);
    }

    function aoInstalar() {
      setInstalado(true);
      setEvento(null);
    }

    window.addEventListener("beforeinstallprompt", aoPoderInstalar);
    window.addEventListener("appinstalled", aoInstalar);

    return () => {
      window.removeEventListener("beforeinstallprompt", aoPoderInstalar);
      window.removeEventListener("appinstalled", aoInstalar);
    };
  }, []);

  async function instalar() {
    if (!evento) return false;
    evento.prompt();
    const escolha = await evento.userChoice;
    setEvento(null);
    return escolha.outcome === "accepted";
  }

  return { podeInstalar: Boolean(evento), instalado, instalar };
}
