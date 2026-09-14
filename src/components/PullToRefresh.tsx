import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

const LIMIAR_PX = 70;
const ALTURA_MAXIMA_PX = 100;

/**
 * Gesto de "puxar para atualizar" (padrão em app de celular): arrastando a
 * tela para baixo a partir do topo, solta e recarrega a página. Só reage a
 * toque (não a mouse), então em desktop fica inerte sem precisar checar
 * largura de tela. Recarrega a página inteira (não só refaz a consulta ao
 * banco) para o comportamento ficar previsível em qualquer tela do sistema,
 * sem precisar ligar esse componente à lógica de cada página.
 */
export default function PullToRefresh({ children }: { children: ReactNode }) {
  const [distancia, setDistancia] = useState(0);
  const [atualizando, setAtualizando] = useState(false);
  const inicioYRef = useRef<number | null>(null);
  const arrastandoRef = useRef(false);

  useEffect(() => {
    function noTopo(): boolean {
      return window.scrollY <= 0;
    }

    function handleTouchStart(e: TouchEvent): void {
      if (atualizando || !noTopo()) return;
      inicioYRef.current = e.touches[0].clientY;
      arrastandoRef.current = true;
    }

    function handleTouchMove(e: TouchEvent): void {
      if (!arrastandoRef.current || inicioYRef.current === null) return;

      const diferenca = e.touches[0].clientY - inicioYRef.current;
      if (diferenca <= 0 || !noTopo()) {
        arrastandoRef.current = false;
        setDistancia(0);
        return;
      }
      // resistência: o indicador acompanha o dedo cada vez mais devagar
      setDistancia(Math.min(diferenca * 0.5, ALTURA_MAXIMA_PX));
    }

    function handleTouchEnd(): void {
      if (!arrastandoRef.current) return;
      arrastandoRef.current = false;
      inicioYRef.current = null;

      setDistancia((atual) => {
        if (atual >= LIMIAR_PX) {
          setAtualizando(true);
          window.location.reload();
          return LIMIAR_PX;
        }
        return 0;
      });
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [atualizando]);

  return (
    <div>
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-150 sm:hidden"
        style={{ height: atualizando ? 44 : distancia }}
        aria-hidden={!atualizando && distancia === 0}
      >
        <RefreshCw
          className={`h-5 w-5 text-brand dark:text-green-400 ${atualizando ? 'animate-spin' : ''}`}
          style={atualizando ? undefined : { transform: `rotate(${(distancia / LIMIAR_PX) * 180}deg)` }}
          aria-hidden="true"
        />
      </div>
      {children}
    </div>
  );
}
