import * as XLSX from 'xlsx';
import type { PlanilhaGrade } from '../types';
import { gerarHash } from '../utils/hash';

/**
 * Lê o arquivo e devolve a grade bruta (linhas × colunas, por posição).
 * Não assume que a primeira linha é cabeçalho — planilhas reais variam
 * muito (algumas são tabela simples, outras são uma matriz com escolas nas
 * linhas e produtos nas colunas, com título e cabeçalhos em linhas
 * diferentes). Quem decide como interpretar a grade é normalizeService.ts.
 */
export async function lerArquivoExcel(file: File): Promise<PlanilhaGrade> {
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
  return XLSX.utils.sheet_to_json<PlanilhaGrade[number]>(planilha, { header: 1, defval: null, raw: true });
}

/** Hash do conteúdo lido, usado por historyService para detectar reimportação da mesma planilha. */
export function calcularHashPlanilha(grade: PlanilhaGrade): string {
  return gerarHash(JSON.stringify(grade));
}
