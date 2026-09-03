import { Building2 } from 'lucide-react';
import { EMPRESA } from '../services/api';

interface LogoProps {
  className?: string;
}

/**
 * Usa EMPRESA.logoUrl (src/services/mockData.ts) assim que o arquivo do
 * logotipo oficial for enviado; até lá, cai num ícone genérico com a cor da
 * marca — nenhum outro componente precisa mudar quando o logo real chegar.
 */
export default function Logo({ className = 'h-6 w-6' }: LogoProps) {
  if (EMPRESA.logoUrl) {
    return <img src={EMPRESA.logoUrl} alt={EMPRESA.nome} className={`${className} object-contain`} />;
  }
  return <Building2 className={`${className} text-brand`} aria-hidden="true" />;
}
