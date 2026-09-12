import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { DadosEscolaCadastrada } from '../services/escolasStore';
import type { EscolaCadastrada } from '../types';

interface EditarEscolaCadastradaModalProps {
  escola: EscolaCadastrada | null;
  onSalvar: (dados: DadosEscolaCadastrada) => void;
  onFechar: () => void;
}

function Campo({
  label,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block text-xs font-medium text-gray-600">
      {label}
      <input
        type="text"
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-9 w-full rounded-md border border-gray-300 px-2.5 text-sm text-gray-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-light"
      />
    </label>
  );
}

/**
 * Cadastro (criação/edição) de uma escola na base própria da empresa. Os
 * apelidos são o que permite o sistema reconhecer a mesma escola escrita de
 * jeitos diferentes na planilha real (abreviação, "SEDE"/"ANEXO", com ou sem
 * "E.M.") e preencher endereço/horário automaticamente nas próximas importações.
 */
export default function EditarEscolaCadastradaModal({
  escola,
  onSalvar,
  onFechar,
}: EditarEscolaCadastradaModalProps) {
  const [nome, setNome] = useState(escola?.nome ?? '');
  const [apelidos, setApelidos] = useState((escola?.apelidos ?? []).join(', '));
  const [codigoEscola, setCodigoEscola] = useState(escola?.codigoEscola ?? '');
  const [cnpj, setCnpj] = useState(escola?.cnpj ?? '');
  const [rua, setRua] = useState(escola?.endereco.rua ?? '');
  const [numero, setNumero] = useState(String(escola?.endereco.numero ?? ''));
  const [bairro, setBairro] = useState(escola?.endereco.bairro ?? '');
  const [cidade, setCidade] = useState(escola?.endereco.cidade ?? '');
  const [uf, setUf] = useState(escola?.endereco.uf ?? '');
  const [cep, setCep] = useState(escola?.endereco.cep ?? '');
  const [horarioFuncionamento, setHorarioFuncionamento] = useState(escola?.horarioFuncionamento ?? '');

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    onSalvar({
      nome: nome.trim(),
      apelidos: apelidos
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
      codigoEscola: codigoEscola.trim(),
      cnpj: cnpj.trim(),
      endereco: {
        rua: rua.trim(),
        numero: numero.trim(),
        bairro: bairro.trim() || null,
        cidade: cidade.trim(),
        uf: uf.trim() || null,
        cep: cep.trim() || null,
      },
      horarioFuncionamento: horarioFuncionamento.trim() || null,
    });
  }

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-editar-escola"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="titulo-editar-escola" className="text-base font-semibold text-gray-900">
            {escola ? 'Editar escola' : 'Nova escola'}
          </h2>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Campo label="Nome da escola" value={nome} onChange={setNome} required />

          <label className="block text-xs font-medium text-gray-600">
            Apelidos / outras formas do nome na planilha
            <input
              type="text"
              value={apelidos}
              onChange={(e) => setApelidos(e.target.value)}
              placeholder="Ex: E.M. Alfeu Rodrigues, Alfeu Rodrigues Sede"
              className="mt-1 h-9 w-full rounded-md border border-gray-300 px-2.5 text-sm text-gray-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-light"
            />
            <span className="mt-1 block text-[11px] font-normal text-gray-400">
              Separe por vírgula. Usados para reconhecer a escola mesmo quando a planilha escreve o nome diferente.
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Código da escola" value={codigoEscola} onChange={setCodigoEscola} />
            <Campo label="CNPJ" value={cnpj} onChange={setCnpj} />
          </div>

          <Campo label="Horário de funcionamento" value={horarioFuncionamento} onChange={setHorarioFuncionamento} placeholder="Ex: 7:00 as 16:00" />

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Campo label="Rua" value={rua} onChange={setRua} />
            </div>
            <Campo label="Número" value={numero} onChange={setNumero} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Campo label="Bairro" value={bairro ?? ''} onChange={setBairro} />
            <Campo label="Cidade" value={cidade} onChange={setCidade} />
            <Campo label="UF" value={uf ?? ''} onChange={setUf} />
          </div>
          <Campo label="CEP" value={cep ?? ''} onChange={setCep} />

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onFechar}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
            >
              Salvar escola
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
