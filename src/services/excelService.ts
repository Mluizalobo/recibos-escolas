import * as XLSX from 'xlsx';
import type { PlanilhaLinha } from '../types';
import { gerarHash } from '../utils/hash';

/** Lê o arquivo e devolve as linhas em formato JSON, com as chaves originais da planilha. */
export async function lerArquivoExcel(file: File): Promise<PlanilhaLinha[]> {
  let workbook: XLSX.WorkBook;
  try {
    const buffer = await file.arrayBuffer();
    workbook = XLSX.read(buffer, { type: 'array' });
  } catch {
    throw new Error('Não foi possível ler o arquivo. Verifique se é uma planilha válida (.xlsx ou .xls).');
  }

  const nomeAba = workbook.SheetNames[0];
  if (!nomeAba) {
    throw new Error('A planilha não possui nenhuma aba com dados.');
  }

  const planilha = workbook.Sheets[nomeAba];
  return XLSX.utils.sheet_to_json<PlanilhaLinha>(planilha, { defval: null, raw: true });
}

/** Hash do conteúdo lido, usado por historyService para detectar reimportação da mesma planilha. */
export function calcularHashPlanilha(linhas: PlanilhaLinha[]): string {
  return gerarHash(JSON.stringify(linhas));
}
