interface LoadingIndicatorProps {
  label?: string;
}

export default function LoadingIndicator({ label = 'Consultando dados…' }: LoadingIndicatorProps) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 py-12 text-gray-500">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
