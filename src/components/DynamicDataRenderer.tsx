import type { JsonObject, JsonPrimitive, JsonValue } from '../types';
import { formatLabel } from '../utils/labelFormatter';
import { EMPTY_PLACEHOLDER, formatPrimitiveValue } from '../utils/formatters';
import DataTable from './DataTable';
import DataCard from './DataCard';

export function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isPrimitive(value: JsonValue): value is JsonPrimitive {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

/** Duas listas de chaves contam como "mesma estrutura" quando são idênticas. */
function saoObjetosSemelhantes(objetos: JsonObject[]): boolean {
  if (objetos.length <= 1) return true;
  const chaves0 = new Set(Object.keys(objetos[0]));
  return objetos.every((obj) => {
    const chaves = new Set(Object.keys(obj));
    if (chaves.size !== chaves0.size) return false;
    for (const chave of chaves0) {
      if (!chaves.has(chave)) return false;
    }
    return true;
  });
}

function ArrayRenderer({ items }: { items: JsonValue[] }) {
  if (items.length === 0) {
    return <p className="text-sm italic text-gray-400">Nenhum registro</p>;
  }

  const todosObjetos = items.every(isJsonObject);
  if (todosObjetos) {
    const objetos = items as JsonObject[];
    if (saoObjetosSemelhantes(objetos)) {
      return <DataTable rows={objetos} />;
    }
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {objetos.map((obj, index) => (
          <DataCard key={index} data={obj} />
        ))}
      </div>
    );
  }

  const todosPrimitivos = items.every(isPrimitive);
  if (todosPrimitivos) {
    return (
      <div className="flex flex-wrap gap-2">
        {(items as JsonPrimitive[]).map((item, index) => (
          <span
            key={index}
            className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
          >
            {formatPrimitiveValue(item)}
          </span>
        ))}
      </div>
    );
  }

  // Lista com tipos mistos (objetos + primitivos + arrays): cada item é
  // renderizado recursivamente, sem assumir uma forma única para a lista.
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={index} className="rounded-lg border border-gray-100 p-2">
          <DynamicDataRenderer data={item} level={1} />
        </li>
      ))}
    </ul>
  );
}

function Campo({ label, valor, level }: { label: string; valor: JsonValue; level: number }) {
  if (isPrimitive(valor)) {
    return (
      <div className="flex flex-col gap-0.5 border-b border-gray-100 pb-2 last:border-0 sm:flex-row sm:items-baseline sm:gap-2">
        <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 sm:w-48 sm:shrink-0">
          {label}
        </dt>
        <dd className="text-sm text-gray-900">{formatPrimitiveValue(valor, label)}</dd>
      </div>
    );
  }

  if (Array.isArray(valor)) {
    return (
      <div className="space-y-2 border-b border-gray-100 pb-3 last:border-0">
        <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
        <dd>
          <ArrayRenderer items={valor} />
        </dd>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50/60 p-3">
      <dt className="text-sm font-semibold text-gray-800">{label}</dt>
      <dd>
        <DynamicDataRenderer data={valor} level={level + 1} />
      </dd>
    </div>
  );
}

interface DynamicDataRendererProps {
  /** Qualquer JSON válido — string, número, boolean, null, objeto ou array. */
  data: JsonValue;
  /** Profundidade da recursão, usada apenas para estilo (indentação/hierarquia). */
  level?: number;
}

/**
 * Renderiza qualquer JsonValue recursivamente, sem depender de nomes de
 * campo fixos: objetos viram seções de rótulo/valor, arrays de primitivos
 * viram tags, arrays de objetos semelhantes viram tabela, arrays de objetos
 * com estruturas diferentes viram cards, e valores vazios nunca aparecem
 * como null/undefined/NaN na tela.
 */
export default function DynamicDataRenderer({ data, level = 0 }: DynamicDataRendererProps) {
  if (isPrimitive(data)) {
    return <span className="text-sm text-gray-800">{formatPrimitiveValue(data)}</span>;
  }

  if (Array.isArray(data)) {
    return <ArrayRenderer items={data} />;
  }

  const entradas = Object.entries(data).filter(([, valor]) => valor !== undefined) as [
    string,
    JsonValue,
  ][];

  if (entradas.length === 0) {
    return <p className="text-sm italic text-gray-400">{EMPTY_PLACEHOLDER}</p>;
  }

  return (
    <dl className={level === 0 ? 'space-y-3' : 'mt-2 space-y-3'}>
      {entradas.map(([chave, valor]) => (
        <Campo key={chave} label={formatLabel(chave)} valor={valor} level={level} />
      ))}
    </dl>
  );
}
