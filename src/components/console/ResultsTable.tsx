interface ResultsTableProps {
  hasExecuted: boolean;
  resultRows: Record<string, any>[];
  columns: string[];
  execTimeMs: number | null;
  statusText: string;
  errorText: string | null;
  onErrorDismiss: () => void;
  isFullscreen: boolean;
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
}: ResultsTableProps) {
  return (
    <>
      {/* Results Status Header */}
      <div className="flex items-center justify-between border-b border-[#232836] bg-[#0e111a] px-4 py-2 text-xs font-mono">
        <span className="text-slate-300 font-medium">
          Results{' '}
          {hasExecuted ? `(${resultRows.length} ${resultRows.length === 1 ? 'row' : 'rows'})` : ''}
        </span>

        <div className="flex items-center space-x-3 text-slate-400">
          {execTimeMs !== null && <span className="text-emerald-400">{execTimeMs} ms</span>}
          {execTimeMs !== null && <span className="text-slate-600">|</span>}
          <span className="text-slate-400">{statusText}</span>
        </div>
      </div>

      {/* Error Message */}
      {errorText && (
        <div className="px-4 py-2 bg-red-950/40 border-b border-red-800/40 text-red-300 font-mono text-xs flex items-center justify-between">
          <span>Error: {errorText}</span>
          <button
            type="button"
            onClick={onErrorDismiss}
            className="text-red-400 hover:text-red-200 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Results Viewport */}
      <div
        className={`overflow-auto bg-[#08090d] font-mono text-xs flex-1 ${
          isFullscreen ? 'min-h-0 max-h-none' : 'min-h-[260px] max-h-[460px]'
        }`}
      >
        {hasExecuted ? (
          resultRows.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#111520] border-b border-[#232836] sticky top-0 z-10">
                    {columns.map((col) => (
                      <th
                        key={col}
                        className="px-4 py-2.5 text-[11px] font-semibold text-slate-300 uppercase tracking-wider whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b202e]/60">
                  {resultRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-[#121624] transition-colors">
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
                              val === null ? 'text-slate-500 italic' : 'text-slate-300'
                            }`}
                          >
                            {isLink ? (
                              <a
                                href={val}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sky-400 hover:underline inline-flex items-center space-x-1"
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
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <p>No rows returned.</p>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-2">
            <div className="text-xs font-mono text-slate-400">Query ready to execute.</div>
            <div className="text-[11px] font-mono text-slate-500">
              Click <span className="text-sky-400 font-semibold">Run Query</span> or press{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-[#1c2233] text-slate-300 border border-[#2e3752]">
                ⌘ + Enter
              </kbd>{' '}
              to view results
            </div>
          </div>
        )}
      </div>
    </>
  );
}
