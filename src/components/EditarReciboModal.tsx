import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { DadosCorrecaoRecibo } from '../services/recibosStore';
import type { ReciboPreparado } from '../types';

interface EditarReciboModalProps {
  recibo: ReciboPreparado;
  onSalvar: (dados: DadosCorrecaoRecibo) => void;
  onFechar: () => void;
}

function Campo({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block text-xs font-medium text-gray-600">
      {label}
      <input
        type="text"
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-9 w-full rounded-md border border-gray-300 px-2.5 text-sm text-gray-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-light"
      />
    </label>
  );
}

/**
 * Correção manual pontual de um recibo com pendências (ex: CNPJ ou endereço
 * ausentes na planilha). Não corrige itens ausentes — isso exige ajustar a
 * planilha de origem — então um recibo "com erro" por falta de itens continua
 * "com erro" mesmo depois de salvar aqui.
 */
export default function EditarReciboModal({ recibo, onSalvar, onFechar }: EditarReciboModalProps) {
  const { escola } = recibo.entrega;
  const [nome, setNome] = useState(escola.nome);
  const [codigoEscola, setCodigoEscola] = useState(escola.codigoEscola);
  const [cnpj, setCnpj] = useState(escola.cnpj);
  const [numeroPedido, setNumeroPedido] = useState(recibo.entrega.numeroPedido);
  const [rua, setRua] = useState(escola.endereco.rua);
  const [cidade, setCidade] = useState(escola.endereco.cidade);
  const [uf, setUf] = useState(escola.endereco.uf ?? '');

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    onSalvar({
      nome: nome.trim(),
      codigoEscola: codigoEscola.trim(),
      cnpj: cnpj.trim(),
      numeroPedido: numeroPedido.trim(),
      rua: rua.trim(),
      cidade: cidade.trim(),
      uf: uf.trim(),
    });
  }

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-editar-recibo"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="titulo-editar-recibo" className="text-base font-semibold text-gray-900">
            Corrigir dados da escola
          </h2>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {recibo.problemas.length > 0 && (
          <ul className="mb-4 space-y-1 rounded-md bg-amber-50 p-3 text-xs text-amber-800">
            {recibo.problemas.map((problema, index) => (
              <li key={index}>{problema.mensagem}</li>
            ))}
          </ul>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <Campo label="Nome da escola" value={nome} onChange={setNome} required />
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Código da escola" value={codigoEscola} onChange={setCodigoEscola} />
            <Campo label="Número do pedido" value={numeroPedido} onChange={setNumeroPedido} />
          </div>
          <Campo label="CNPJ" value={cnpj} onChange={setCnpj} />
          <Campo label="Rua" value={rua} onChange={setRua} />
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Cidade" value={cidade} onChange={setCidade} />
            <Campo label="UF" value={uf} onChange={setUf} />
          </div>

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
              Salvar correção
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

