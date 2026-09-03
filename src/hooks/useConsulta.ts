import { useCallback, useRef, useState } from 'react';
import { consultarEntrega, type ResultadoConsulta } from '../services/api';
import { ApiError, type ApiErrorKind, type SearchType } from '../types';

export interface ErroConsulta {
  kind: ApiErrorKind;
  message: string;
}

interface EstadoConsulta {
  loading: boolean;
  resultado: ResultadoConsulta | null;
  erro: ErroConsulta | null;
}

const ESTADO_INICIAL: EstadoConsulta = { loading: false, resultado: null, erro: null };

/**
 * Encapsula o ciclo de vida de uma consulta: loading, resultado e erro.
 * Nunca mantém o resultado anterior visível durante uma nova busca, e
 * ignora chamadas de busca disparadas enquanto outra já está em andamento.
 */
export function useConsulta() {
  const [estado, setEstado] = useState<EstadoConsulta>(ESTADO_INICIAL);
  const emAndamentoRef = useRef(false);
  const ultimaBuscaRef = useRef<{ tipo: SearchType; valor: string } | null>(null);

  const buscar = useCallback(async (tipo: SearchType, valor: string) => {
    if (emAndamentoRef.current) return;
    emAndamentoRef.current = true;
    ultimaBuscaRef.current = { tipo, valor };

    setEstado({ loading: true, resultado: null, erro: null });

    try {
      const resultado = await consultarEntrega(tipo, valor);
      setEstado({ loading: false, resultado, erro: null });
    } catch (err) {
      const erro: ErroConsulta =
        err instanceof ApiError
          ? { kind: err.kind, message: err.message }
          : { kind: 'unknown', message: 'Ocorreu um erro inesperado. Tente novamente.' };
      setEstado({ loading: false, resultado: null, erro });
    } finally {
      emAndamentoRef.current = false;
    }
  }, []);

  const tentarNovamente = useCallback(() => {
    const ultima = ultimaBuscaRef.current;
    if (ultima) buscar(ultima.tipo, ultima.valor);
  }, [buscar]);

  const limpar = useCallback(() => {
    ultimaBuscaRef.current = null;
    setEstado(ESTADO_INICIAL);
  }, []);

  return { ...estado, buscar, tentarNovamente, limpar };
}
