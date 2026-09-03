import type { Empresa, JsonObject } from '../types';
import { formatCnpj, formatCurrency, formatDate } from '../utils/formatters';
import DynamicDataRenderer from './DynamicDataRenderer';
import Logo from './Logo';

interface ReciboTemplateProps {
  empresa: Empresa;
  dados: JsonObject;
}

function getPath(source: unknown, path: string[]): unknown {
  return path.reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, source);
}

function primeiro(dados: JsonObject, caminhos: string[][]): unknown {
  for (const caminho of caminhos) {
    const valor = getPath(dados, caminho);
    if (valor !== undefined && valor !== null && valor !== '') return valor;
  }
  return undefined;
}

function texto(valor: unknown, fallback = 'Não informado'): string {
  return typeof valor === 'string' || typeof valor === 'number' ? String(valor) : fallback;
}

function formatarEndereco(valor: unknown): string {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return 'Não informado';
  const end = valor as Record<string, unknown>;
  const partes = [
    [end.rua, end.numero].filter((v) => v !== undefined && v !== null && v !== '').join(', '),
    end.bairro,
    [end.cidade, end.uf].filter(Boolean).join('/'),
    end.cep,
  ].filter((parte) => parte && String(parte).trim() !== '');
  return partes.length > 0 ? partes.join(' — ') : 'Não informado';
}

/**
 * Layout inicial e configurável do recibo — pensado para ser adaptado assim
 * que o modelo Word oficial da empresa for fornecido (ver seção "Onde
 * alterar o modelo do recibo" no README). Os campos são extraídos por
 * caminhos alternativos para funcionar mesmo com formatos de entrega
 * diferentes entre si.
 */
export default function ReciboTemplate({ empresa, dados }: ReciboTemplateProps) {
  const nomeEscola = texto(
    primeiro(dados, [['nome'], ['escola', 'nome'], ['identificacao', 'unidadeEscolar']]),
  );
  const codigoEscola = primeiro(dados, [
    ['codigoEscola'],
    ['escola', 'codigoEscola'],
    ['identificacao', 'codigo'],
  ]);
  const cnpjBruto = primeiro(dados, [['cnpj'], ['escola', 'cnpj'], ['identificacao', 'cnpjUnidade']]);
  const enderecoBruto = primeiro(dados, [['endereco'], ['escola', 'endereco']]);
  const numeroPedido = primeiro(dados, [['numeroPedido'], ['entregaInfo', 'numeroPedido']]);
  const codigoEntrega = primeiro(dados, [['codigoEntrega'], ['identificacao', 'codigo']]);
  const dataBruta = primeiro(dados, [
    ['dataEntrega'],
    ['entregaInfo', 'dataRealizada'],
    ['entregaInfo', 'dataPrevista'],
  ]);
  const statusBruto = primeiro(dados, [['status'], ['entregaInfo', 'statusEntrega']]);
  const itens = primeiro(dados, [['itens'], ['itensRecebidos']]);
  const valorTotal = primeiro(dados, [['valorTotal']]);
  const observacoesBrutas = primeiro(dados, [['observacoes'], ['observacaoGeral']]);
  const responsavel = primeiro(dados, [['responsavelRecebimento'], ['responsavel']]);

  const observacoesLista: string[] = Array.isArray(observacoesBrutas)
    ? observacoesBrutas.filter((o): o is string => typeof o === 'string')
    : typeof observacoesBrutas === 'string'
      ? [observacoesBrutas]
      : [];

  return (
    <div
      className="mx-auto w-full max-w-[210mm] bg-white p-8 text-[13px] leading-relaxed text-gray-900 print:p-0 print:shadow-none"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      <header className="flex items-start justify-between border-b-2 border-gray-800 pb-4">
        <div className="flex items-start gap-3">
          <Logo className="mt-0.5 h-8 w-8 shrink-0" />
          <div>
            <h1 className="text-lg font-bold uppercase tracking-wide">{empresa.nome}</h1>
            {empresa.cnpj && <p className="text-xs text-gray-600">CNPJ: {formatCnpj(empresa.cnpj)}</p>}
            {empresa.endereco && <p className="text-xs text-gray-600">{empresa.endereco}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold uppercase text-gray-700">Recibo de Entrega</p>
          {codigoEntrega !== undefined && (
            <p className="text-xs text-gray-500">Nº {texto(codigoEntrega)}</p>
          )}
        </div>
      </header>

      <section className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 border-b border-gray-200 pb-4 text-xs">
        <div>
          <span className="font-semibold">Escola: </span>
          {nomeEscola}
        </div>
        {codigoEscola !== undefined && (
          <div>
            <span className="font-semibold">Código: </span>
            {texto(codigoEscola)}
          </div>
        )}
        <div>
          <span className="font-semibold">CNPJ: </span>
          {typeof cnpjBruto === 'string' ? formatCnpj(cnpjBruto) : 'Não informado'}
        </div>
        <div>
          <span className="font-semibold">Pedido: </span>
          {texto(numeroPedido)}
        </div>
        <div className="col-span-2">
          <span className="font-semibold">Endereço: </span>
          {formatarEndereco(enderecoBruto)}
        </div>
        <div>
          <span className="font-semibold">Data da entrega: </span>
          {typeof dataBruta === 'string' ? formatDate(dataBruta) : 'Não informado'}
        </div>
        <div>
          <span className="font-semibold">Status: </span>
          {texto(statusBruto)}
        </div>
      </section>

      <section className="mt-4">
        <h2 className="mb-2 text-sm font-semibold uppercase text-gray-700">Itens entregues</h2>
        {Array.isArray(itens) && itens.length > 0 ? (
          <DynamicDataRenderer data={itens} />
        ) : (
          <p className="text-xs italic text-gray-400">Nenhum item informado.</p>
        )}
        {typeof valorTotal === 'number' && (
          <p className="mt-2 text-right text-sm font-semibold">
            Valor total: {formatCurrency(valorTotal)}
          </p>
        )}
      </section>

      {observacoesLista.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-1 text-sm font-semibold uppercase text-gray-700">Observações</h2>
          <ul className="list-disc space-y-0.5 pl-5 text-xs text-gray-700">
            {observacoesLista.map((observacao, index) => (
              <li key={index}>{observacao}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10 grid grid-cols-2 gap-8 text-xs">
        <div>
          <div className="h-14 border-b border-gray-500" />
          <p className="mt-1">Assinatura do responsável pelo recebimento</p>
          <p className="text-gray-500">{texto(responsavel, '—')}</p>
        </div>
        <div>
          <div className="h-14 border-b border-gray-500" />
          <p className="mt-1">Local e data</p>
          <p className="text-gray-500">____________________, ____/____/______</p>
        </div>
      </section>

      <div className="mt-8 flex justify-end">
        <div className="h-16 w-24 rounded border border-dashed border-gray-300 text-center text-[9px] leading-[4rem] text-gray-300">
          Carimbo
        </div>
      </div>
    </div>
  );
}
