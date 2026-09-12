import { Building2, Mail, MapPin, Phone } from 'lucide-react';
import { EMPRESA } from '../services/api';
import Logo from '../components/Logo';

function Campo({ icone: Icone, label, valor }: { icone: typeof Building2; label: string; valor?: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-gray-100 dark:border-gray-800 py-3 last:border-0">
      <Icone className="mt-0.5 h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden="true" />
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</dt>
        <dd className="text-sm text-gray-900 dark:text-gray-100">{valor && valor.trim() ? valor : '—'}</dd>
      </div>
    </div>
  );
}

/** Dados cadastrais da empresa, usados no cabeçalho do sistema e no recibo. */
export default function DadosEmpresa() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Dados da Empresa</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Informações cadastrais usadas no sistema e no recibo oficial.</p>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-6 text-center sm:flex-row sm:text-left">
          <Logo lockup className="h-20 w-auto" />
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{EMPRESA.nome}</h2>
            {EMPRESA.razaoSocial && <p className="text-sm text-gray-500 dark:text-gray-400">{EMPRESA.razaoSocial}</p>}
          </div>
        </div>

        <dl>
          <Campo icone={Building2} label="CNPJ" valor={EMPRESA.cnpj} />
          <Campo icone={MapPin} label="Endereço" valor={EMPRESA.endereco} />
          <Campo icone={Phone} label="Telefone" valor={EMPRESA.telefone} />
          <Campo icone={Mail} label="E-mail" valor={EMPRESA.email} />
        </dl>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500">
        CNPJ, endereço, telefone e e-mail ainda são placeholder — atualizar em{' '}
        <code className="rounded bg-gray-100 dark:bg-gray-800 px-1 py-0.5">src/services/mockData.ts</code> quando os dados reais da
        empresa estiverem disponíveis.
      </p>
    </div>
  );
}
