import type { JsonObject } from '../types';
import DynamicDataRenderer from './DynamicDataRenderer';

interface DataCardProps {
  data: JsonObject;
  title?: string;
}

/** Card genérico para um objeto isolado, usado quando itens de um array têm estruturas diferentes entre si. */
export default function DataCard({ data, title }: DataCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      {title && <h4 className="mb-2 text-sm font-semibold text-gray-800">{title}</h4>}
      <DynamicDataRenderer data={data} level={1} />
    </div>
  );
}
