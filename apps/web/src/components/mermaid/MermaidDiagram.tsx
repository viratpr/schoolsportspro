'use client';

import { useEffect, useId, useRef, useState } from 'react';
import mermaid from 'mermaid';

type MermaidDiagramProps = {
  chart: string;
  className?: string;
};

export default function MermaidDiagram({ chart, className = '' }: MermaidDiagramProps) {
  const id = useId().replace(/:/g, '-');
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chart?.trim() || !containerRef.current) return;

    setError(null);
    const uniqueId = `mermaid-${id}`;

    mermaid
      .render(uniqueId, chart.trim())
      .then(({ svg }) => {
        if (containerRef.current) containerRef.current.innerHTML = svg;
      })
      .catch((err) => {
        setError(err?.message ?? 'Failed to render diagram');
      });
  }, [chart, id]);

  if (error) {
    return (
      <div className={`rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive ${className}`}>
        <p className="font-medium">Mermaid diagram error</p>
        <pre className="mt-2 whitespace-pre-wrap break-all">{error}</pre>
        <details className="mt-2">
          <summary className="cursor-pointer text-muted-foreground">Show source</summary>
          <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">{chart}</pre>
        </details>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-mermaid
      className={`flex justify-center [&_svg]:max-w-full [&_svg]:h-auto ${className}`}
    />
  );
}
