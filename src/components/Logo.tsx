import { Building2 } from 'lucide-react';
import { EMPRESA } from '../services/api';

interface LogoProps {
  className?: string;
  /** Usa a versão com o nome por extenso (logoLockupUrl) — telas com mais espaço, como login. */
  lockup?: boolean;
}

/**
 * Usa EMPRESA.logoUrl/logoLockupUrl (src/services/mockData.ts); até lá, cai
 * num ícone genérico com a cor da marca — nenhum outro componente precisa
 * mudar quando o arquivo do logo for trocado de novo.
 */
export default function Logo({ className = 'h-6 w-6', lockup = false }: LogoProps) {
  const src = lockup ? (EMPRESA.logoLockupUrl ?? EMPRESA.logoUrl) : EMPRESA.logoUrl;
  if (src) {
    return <img src={src} alt={EMPRESA.nome} className={`${className} object-contain`} />;
  }
  return <Building2 className={`${className} text-brand`} aria-hidden="true" />;
}
