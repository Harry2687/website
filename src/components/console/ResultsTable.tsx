import { Loader2 } from 'lucide-react';
import { useModifierKey } from './useModifierKey';

interface ResultsTableProps {
  hasExecuted: boolean;
  resultRows: Record<string, any>[];
  columns: string[];
  execTimeMs: number | null;
  statusText: string;
  errorText: string | null;
  onErrorDismiss: () => void;
  isFullscreen: boolean;
  isExecuting?: boolean;
}

export default function ResultsTable({
  hasExecuted,
  resultRows,
  columns,
  execTimeMs,
  statusText,
  errorText,
  onErrorDismiss,
  isFullscreen,
  isExecuting = false,
}: ResultsTableProps) {
  const modifierKey = useModifierKey();
  return (
    <>
      {/* Results Status Header */}
      <div className="flex items-center justify-between border-b border-vsc-border bg-vsc-bar px-4 py-2 text-xs font-mono">
        <span className="text-vsc-fg font-medium">
          Results{' '}
          {hasExecuted && !isExecuting
            ? `(${resultRows.length} ${resultRows.length === 1 ? 'row' : 'rows'})`
            : ''}
        </span>

        <div className="flex items-center space-x-3 text-vsc-fg-muted">
          {isExecuting ? (
            <span className="flex items-center space-x-1.5 text-vsc-blue font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{statusText}</span>
            </span>
          ) : (
            <>
              {execTimeMs !== null && (
                <span className="text-emerald-600 dark:text-emerald-400">{execTimeMs} ms</span>
              )}
              {execTimeMs !== null && <span className="text-vsc-fg-subtle">|</span>}
              <span className="text-vsc-fg-muted">{statusText}</span>
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      {errorText && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/30 text-red-600 dark:text-red-300 font-mono text-xs flex items-center justify-between">
          <span>Error: {errorText}</span>
          <button
            type="button"
            onClick={onErrorDismiss}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Results Viewport */}
      <div
        className={`overflow-auto bg-vsc-editor font-mono text-xs flex-1 ${
          isFullscreen ? 'min-h-0 max-h-none' : 'min-h-[260px] max-h-[460px]'
        }`}
      >
        {hasExecuted ? (
          resultRows.length > 0 ? (
            <div
              className={`w-full overflow-x-auto transition-opacity duration-200 ${
                isExecuting ? 'opacity-35 pointer-events-none' : 'opacity-100'
              }`}
            >
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-vsc-table-header border-b border-vsc-border sticky top-0 z-10">
                    {columns.map((col) => (
                      <th
                        key={col}
                        className="px-4 py-2.5 text-[11px] font-semibold text-vsc-fg uppercase tracking-wider whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-vsc-border">
                  {resultRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-vsc-row-hover transition-colors">
                      {columns.map((col) => {
                        const val = row[col];
                        const isLink = typeof val === 'string' && val.startsWith('http');

                        let formatted = val;
                        if (val === null || val === undefined) {
                          formatted = 'null';
                        } else if (typeof val === 'bigint') {
                          formatted = val.toString();
                        } else if (val instanceof Date) {
                          formatted = Number.isNaN(val.getTime())
                            ? ''
                            : val.toISOString().split('T')[0];
                        } else if (col.toLowerCase().includes('date') && typeof val === 'number') {
                          const ms = val > 100000000 ? val : val * 86400000;
                          const d = new Date(ms);
                          formatted = !Number.isNaN(d.getTime())
                            ? d.toISOString().split('T')[0]
                            : String(val);
                        } else if (
                          col.toLowerCase().includes('date') &&
                          typeof val === 'string' &&
                          val.includes('T')
                        ) {
                          formatted = val.split('T')[0];
                        } else {
                          formatted = String(val);
                        }

                        return (
                          <td
                            key={col}
                            className={`px-4 py-3 whitespace-nowrap ${
                              val === null ? 'text-vsc-fg-subtle italic' : 'text-vsc-fg'
                            }`}
                          >
                            {isLink ? (
                              <a
                                href={val}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-vsc-blue hover:underline inline-flex items-center space-x-1"
                              >
                                <span>{val}</span>
                                <span>↗</span>
                              </a>
                            ) : (
                              formatted
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-vsc-fg-muted">
              <p>No rows returned.</p>
            </div>
          )
        ) : isExecuting ? (
          <div className="flex flex-col items-center justify-center py-20 text-vsc-fg-muted space-y-3">
            <Loader2 className="w-6 h-6 text-vsc-blue animate-spin" />
            <div className="text-xs font-mono text-vsc-fg">Processing query plan...</div>
            <div className="text-[11px] font-mono text-vsc-fg-subtle">{statusText}</div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-vsc-fg-muted space-y-2">
            <div className="text-xs font-mono text-vsc-fg">Query ready to execute.</div>
            <div className="text-[11px] font-mono text-vsc-fg-subtle">
              Click <span className="text-vsc-blue font-semibold">Run Query</span> or press{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-vsc-kbd-bg text-vsc-kbd-text border border-vsc-kbd-border">
                {modifierKey} + Enter
              </kbd>{' '}
              to view results
            </div>
          </div>
        )}
      </div>
    </>
  );
}
