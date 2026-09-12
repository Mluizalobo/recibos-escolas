import type { JsonObject, JsonValue } from '../types';
import { formatLabel } from '../utils/labelFormatter';
import { formatPrimitiveValue } from '../utils/formatters';
import DynamicDataRenderer, { isPrimitive } from './DynamicDataRenderer';

interface DataTableProps {
  rows: JsonObject[];
}

/** Tabela genérica para arrays de objetos com a mesma estrutura (ex: itens de uma entrega). */
export default function DataTable({ rows }: DataTableProps) {
  const colunas: string[] = [];
  rows.forEach((row) => {
    Object.keys(row).forEach((chave) => {
      if (!colunas.includes(chave)) colunas.push(chave);
    });
  });

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {colunas.map((coluna) => (
              <th
                key={coluna}
                scope="col"
                className="whitespace-nowrap px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-400"
              >
                {formatLabel(coluna)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
          {rows.map((row, index) => (
            <tr key={index}>
              {colunas.map((coluna) => {
                const valor = row[coluna] as JsonValue | undefined;
                return (
                  <td key={coluna} className="px-3 py-2 align-top text-gray-800 dark:text-gray-200">
                    {valor === undefined ? (
                      <span className="text-gray-300 dark:text-gray-600">—</span>
                    ) : isPrimitive(valor) ? (
                      formatPrimitiveValue(valor, coluna)
                    ) : (
                      <DynamicDataRenderer data={valor} level={1} />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
