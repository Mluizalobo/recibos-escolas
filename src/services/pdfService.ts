import jsPDF from 'jspdf';
// html2canvas-pro (não o html2canvas original) porque o Tailwind v4 gera cores em oklch(),
// que a versão original da lib não sabe interpretar ao ler os estilos computados.
import html2canvas from 'html2canvas-pro';
import { sanitizeFileName } from '../utils/formatters';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

async function elementoParaCanvas(elemento: HTMLElement): Promise<HTMLCanvasElement> {
  return html2canvas(elemento, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  });
}

/** Desenha um canvas no PDF, criando novas páginas conforme necessário para não cortar conteúdo. */
function desenharComPaginacao(pdf: jsPDF, canvas: HTMLCanvasElement): void {
  const imgData = canvas.toDataURL('image/png');
  const larguraImg = A4_WIDTH_MM;
  const alturaImg = (canvas.height * larguraImg) / canvas.width;

  let alturaRestante = alturaImg;
  let posicaoY = 0;

  pdf.addImage(imgData, 'PNG', 0, posicaoY, larguraImg, alturaImg);
  alturaRestante -= A4_HEIGHT_MM;

  while (alturaRestante > 0) {
    posicaoY = alturaRestante - alturaImg;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, posicaoY, larguraImg, alturaImg);
    alturaRestante -= A4_HEIGHT_MM;
  }
}

function comExtensaoPdf(nomeArquivo: string): string {
  return nomeArquivo.endsWith('.pdf') ? nomeArquivo : `${nomeArquivo}.pdf`;
}

/** Monta o PDF (um ou mais recibos, um por página) a partir dos elementos já renderizados no DOM. */
async function montarPdf(elementos: HTMLElement[]): Promise<jsPDF> {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  for (let i = 0; i < elementos.length; i += 1) {
    if (i > 0) pdf.addPage();
    const canvas = await elementoParaCanvas(elementos[i]);
    desenharComPaginacao(pdf, canvas);
  }
  return pdf;
}

/** Monta um nome de arquivo previsível e seguro: recibo_NOME_DA_ESCOLA_DD-MM-AAAA.pdf */
export function nomeArquivoRecibo(nomeEscola: string, dataEntrega: string): string {
  const dataSanitizada = sanitizeFileName(dataEntrega.replace(/\//g, '-')) || 'sem-data';
  const nomeSanitizado = sanitizeFileName(nomeEscola) || 'escola';
  return `recibo_${nomeSanitizado}_${dataSanitizada}.pdf`;
}

/** Gera um único PDF a partir de um elemento (recibo) já renderizado no DOM. */
export async function gerarPdfRecibo(elemento: HTMLElement, nomeArquivo: string): Promise<void> {
  const pdf = await montarPdf([elemento]);
  pdf.save(comExtensaoPdf(nomeArquivo));
}

/** Gera um único PDF contendo vários recibos, um por página (uso na geração em lote). */
export async function gerarPdfUnicoComVarios(elementos: HTMLElement[], nomeArquivo: string): Promise<void> {
  const pdf = await montarPdf(elementos);
  pdf.save(comExtensaoPdf(nomeArquivo));
}

/**
 * Se o navegador consegue compartilhar arquivo (Web Share API nível 2) — dá
 * suporte no Android/Chrome e no iOS mais recente, mas não em navegador de
 * computador nem em navegadores mais antigos. Use isso para só mostrar o
 * botão "Compartilhar" quando ele realmente vai funcionar.
 */
export function suportaCompartilharArquivo(): boolean {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) return false;
  try {
    const arquivoTeste = new File([''], 'teste.pdf', { type: 'application/pdf' });
    return navigator.canShare({ files: [arquivoTeste] });
  } catch {
    return false;
  }
}

/**
 * Compartilha um ou mais recibos já renderizados via o menu nativo do
 * celular (WhatsApp, e-mail, Drive, etc), sem precisar baixar o arquivo
 * primeiro. `grupos` é uma lista de listas de elementos: cada sublista vira
 * um arquivo PDF (várias páginas se tiver mais de um elemento); use
 * `suportaCompartilharArquivo()` antes para saber se o botão deve aparecer.
 * Se a pessoa cancelar o menu de compartilhamento, o erro é do tipo
 * `AbortError` — normalmente não deve ser tratado como falha.
 */
export async function compartilharRecibos(grupos: HTMLElement[][], nomesArquivos: string[]): Promise<void> {
  const arquivos: File[] = [];
  for (let i = 0; i < grupos.length; i += 1) {
    const pdf = await montarPdf(grupos[i]);
    const blob = pdf.output('blob');
    arquivos.push(new File([blob], comExtensaoPdf(nomesArquivos[i]), { type: 'application/pdf' }));
  }
  await navigator.share({ files: arquivos });
}
