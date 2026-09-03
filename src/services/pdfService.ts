import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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

/** Monta um nome de arquivo previsível e seguro: recibo_NOME_DA_ESCOLA_DD-MM-AAAA.pdf */
export function nomeArquivoRecibo(nomeEscola: string, dataEntrega: string): string {
  const dataSanitizada = sanitizeFileName(dataEntrega.replace(/\//g, '-')) || 'sem-data';
  const nomeSanitizado = sanitizeFileName(nomeEscola) || 'escola';
  return `recibo_${nomeSanitizado}_${dataSanitizada}.pdf`;
}

/** Gera um único PDF a partir de um elemento (recibo) já renderizado no DOM. */
export async function gerarPdfRecibo(elemento: HTMLElement, nomeArquivo: string): Promise<void> {
  const canvas = await elementoParaCanvas(elemento);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  desenharComPaginacao(pdf, canvas);
  pdf.save(nomeArquivo.endsWith('.pdf') ? nomeArquivo : `${nomeArquivo}.pdf`);
}

/** Gera um único PDF contendo vários recibos, um por página (uso na geração em lote). */
export async function gerarPdfUnicoComVarios(
  elementos: HTMLElement[],
  nomeArquivo: string,
): Promise<void> {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  for (let i = 0; i < elementos.length; i += 1) {
    if (i > 0) pdf.addPage();
    const canvas = await elementoParaCanvas(elementos[i]);
    desenharComPaginacao(pdf, canvas);
  }

  pdf.save(nomeArquivo.endsWith('.pdf') ? nomeArquivo : `${nomeArquivo}.pdf`);
}
