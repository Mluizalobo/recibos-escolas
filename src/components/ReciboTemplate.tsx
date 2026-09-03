import type { Empresa, JsonObject, JsonValue } from '../types';
import { formatDate } from '../utils/formatters';
import { isJsonObject } from './DynamicDataRenderer';

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

function texto(valor: unknown): string | undefined {
  return typeof valor === 'string' || typeof valor === 'number' ? String(valor) : undefined;
}

interface ItemTabela {
  produto: string;
  unidade?: string;
  quantidade?: string;
}

/** Aceita tanto o formato canônico ([{produto,unidade,quantidade}]) quanto listas de formato livre. */
function extrairItens(valor: unknown): ItemTabela[] {
  if (!Array.isArray(valor)) return [];
  return (valor as JsonValue[])
    .filter(isJsonObject)
    .map((item) => {
      const produto = texto(
        item.produto ?? item.descricaoProduto ?? item.descricao ?? item.nome ?? item.item,
      );
      const unidade = texto(item.unidade ?? item.unid ?? item.un);
      const quantidadeBruta = item.quantidade ?? item.quantidadeTotal ?? item.qtd ?? item.quantidadeCaixas;
      const quantidade =
        typeof quantidadeBruta === 'number'
          ? quantidadeBruta.toLocaleString('pt-BR')
          : texto(quantidadeBruta);
      return { produto: produto ?? '—', unidade, quantidade };
    })
    .filter((item) => item.produto !== '—' || item.quantidade);
}

const MINIMO_LINHAS_TABELA = 20;

/**
 * Recibo de entrega no formato oficial usado pela empresa (réplica fiel do
 * modelo fornecido): cabeçalho com razão social, destinatário (prefeitura/
 * escola/horário/endereço), numeração grande do pedido, tabela de produtos
 * com linhas em branco e rodapé "Recebido por" + "Data" — sem CNPJ, sem
 * valores, sem logotipo, exatamente como o documento real.
 */
export default function ReciboTemplate({ empresa, dados }: ReciboTemplateProps) {
  const nomeEscola = texto(
    primeiro(dados, [['nome'], ['escola', 'nome'], ['identificacao', 'unidadeEscolar']]),
  );
  const cidade = texto(
    primeiro(dados, [['endereco', 'cidade'], ['escola', 'endereco', 'cidade']]),
  );
  const uf = texto(primeiro(dados, [['endereco', 'uf'], ['escola', 'endereco', 'uf']]));
  const horario = texto(
    primeiro(dados, [['horarioFuncionamento'], ['escola', 'horarioFuncionamento']]),
  );
  const rua = texto(primeiro(dados, [['endereco', 'rua'], ['escola', 'endereco', 'rua']]));
  const bairro = texto(primeiro(dados, [['endereco', 'bairro'], ['escola', 'endereco', 'bairro']]));
  const numeroPedido = texto(primeiro(dados, [['numeroPedido'], ['entregaInfo', 'numeroPedido']]));
  const dataBruta = primeiro(dados, [
    ['dataEntrega'],
    ['entregaInfo', 'dataRealizada'],
    ['entregaInfo', 'dataPrevista'],
  ]);
  const responsavel = texto(primeiro(dados, [['responsavelRecebimento'], ['responsavel']]));

  const observacoesBrutas = primeiro(dados, [['observacoes']]);
  const observacoes = Array.isArray(observacoesBrutas)
    ? (observacoesBrutas as JsonValue[]).map(texto).filter((valor): valor is string => !!valor)
    : [];

  const itensBrutos = primeiro(dados, [['itens'], ['itensRecebidos']]);
  const itens = extrairItens(itensBrutos);
  const linhasEmBranco = Math.max(0, MINIMO_LINHAS_TABELA - itens.length);

  const enderecoLinha = [rua, bairro].filter(Boolean).join(' – ');
  const destinatario = cidade ? `À Prefeitura Municipal de ${cidade}${uf ? `/${uf}` : ''}` : undefined;

  return (
    // Página A4 real (210 × 297mm): mesmas dimensões e padding são usados na
    // tela, na impressão (@page margin:0 em index.css) e na captura para
    // PDF, então os três resultados são idênticos entre si.
    <div
      className="mx-auto bg-white text-[11px] leading-snug text-black"
      style={{
        width: '210mm',
        minHeight: '297mm',
        boxSizing: 'border-box',
        padding: '10mm',
        fontFamily: 'Arial, Helvetica, sans-serif',
      }}
    >
      <div className="border border-black">
        <div className="border-b border-black bg-gray-200 px-3 py-1.5 text-center">
          <p className="text-sm font-bold">RECIBO DE ENTREGA</p>
          <p className="text-sm font-bold uppercase">{empresa.razaoSocial ?? empresa.nome}</p>
        </div>

        <div className="flex items-stretch border-b border-black">
          <div className="flex-1 space-y-0.5 px-3 py-2 text-center">
            {destinatario && <p className="uppercase">{destinatario}</p>}
            {nomeEscola && <p className="font-bold uppercase">{nomeEscola}</p>}
            {horario && <p>Horário de funcionamento {horario}</p>}
            {enderecoLinha && <p className="font-bold uppercase">{enderecoLinha}</p>}
          </div>
          {numeroPedido && (
            <div className="flex w-20 shrink-0 items-center justify-center border-l border-black">
              <span className="text-4xl font-bold">{numeroPedido}</span>
            </div>
          )}
        </div>

        {observacoes.length > 0 && (
          <div className="border-b border-black bg-amber-50 px-3 py-1.5 text-[10px] italic text-gray-800">
            {observacoes.map((obs, index) => (
              <p key={index}>Observação: {obs}</p>
            ))}
          </div>
        )}

        <table className="w-full border-collapse text-[11px]">
          <colgroup>
            <col style={{ width: '60%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '25%' }} />
          </colgroup>
          <thead>
            <tr className="border-b border-black">
              <th className="border-r border-black px-2 py-1 text-left font-bold">DESCRIÇÃO PRODUTOS</th>
              <th className="border-r border-black px-2 py-1 text-left font-bold">UNID</th>
              <th className="px-2 py-1 text-left font-bold">QUANT</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item, index) => (
              <tr key={index} className="border-b border-black">
                <td className="border-r border-black px-2 py-1">{item.produto}</td>
                <td className="border-r border-black px-2 py-1">{item.unidade ?? ''}</td>
                <td className="px-2 py-1">{item.quantidade ?? ''}</td>
              </tr>
            ))}
            {Array.from({ length: linhasEmBranco }).map((_, index) => (
              <tr key={`branco-${index}`} className="border-b border-black">
                <td className="border-r border-black px-2 py-1.5">&nbsp;</td>
                <td className="border-r border-black px-2 py-1.5">&nbsp;</td>
                <td className="px-2 py-1.5">&nbsp;</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="h-16 border-r border-black px-2 py-1 align-top">
                RECEBIDO POR:{responsavel ? ` ${responsavel}` : ''}
              </td>
              <td className="px-2 py-1 align-top">
                DATA
                {typeof dataBruta === 'string' && (
                  <p className="mt-3">{formatDate(dataBruta)}</p>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
