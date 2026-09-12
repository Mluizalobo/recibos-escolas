import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (.env.local em desenvolvimento; variáveis de ambiente do projeto na Vercel em produção).',
  );
}

/**
 * Cliente único do Supabase, usado por todos os *Store/*Service no lugar do
 * localStorage — assim os dados (escolas cadastradas, recibos preparados,
 * histórico de importações) ficam num banco compartilhado entre qualquer
 * navegador/computador que acessar o sistema, em vez de presos ao navegador
 * de cada um. A chave usada aqui é a "anon"/"publishable" — pública por
 * design, segura para expor no código do site.
 */
export const supabase = createClient(url, anonKey);
