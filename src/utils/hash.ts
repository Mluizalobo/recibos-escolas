/**
 * Hash determinístico simples (djb2), suficiente para detectar planilhas
 * repetidas/idênticas. Não é criptográfico — não usar para segurança.
 */
export function gerarHash(texto: string): string {
  let hash = 5381;
  for (let i = 0; i < texto.length; i += 1) {
    hash = (hash * 33) ^ texto.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}
