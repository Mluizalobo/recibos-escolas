import type { JsonObject } from '../types';
import DynamicDataRenderer from './DynamicDataRenderer';

interface DataCardProps {
  data: JsonObject;
  title?: string;
}

/** Card genérico para um objeto isolado, usado quando itens de um array têm estruturas diferentes entre si. */
export default function DataCard({ data, title }: DataCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 shadow-sm">
      {title && <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</h4>}
      <DynamicDataRenderer data={data} level={1} />
    </div>
  );
}
