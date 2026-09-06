import React, { useState, useEffect, useRef } from 'react';
import aboutData from '../data/about.json';
import careerData from '../data/career.json';
import educationData from '../data/education.json';
import researchData from '../data/research.json';
import skillsData from '../data/skills.json';

type QueryMode = 'sql' | 'polars';

interface QueryPreset {
  label: string;
  sql: string;
  polars: string;
}

const PRESETS: QueryPreset[] = [
  {
    label: 'About Me',
    sql: 'SELECT * FROM about;',
    polars: 'about',
  },
  {
    label: 'Experience',
    sql: 'SELECT role, company, period, domain FROM experience;',
    polars: 'experience.select(["role", "company", "period", "domain"])',
  },
  {
    label: 'Education',
    sql: 'SELECT qualification, institution, period, details FROM education;',
    polars: 'education.select(["qualification", "institution", "period", "details"])',
  },
  {
    label: 'Research',
    sql: 'SELECT title, institution, year, domain, link FROM research;',
    polars: 'research.select(["title", "institution", "year", "domain", "link"])',
  },
  {
    label: 'Skills',
    sql: 'SELECT category, items FROM skills;',
    polars: 'skills.select(["category", "items"])',
  },
];

export default function CareerConsole() {
  const [mode, setMode] = useState<QueryMode>('sql');
  const [query, setQuery] = useState<string>(PRESETS[0].sql);
  const [hasExecuted, setHasExecuted] = useState<boolean>(false);
  const [resultRows, setResultRows] = useState<Record<string, any>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [execTimeMs, setExecTimeMs] = useState<number | null>(null);
  const [statusText, setStatusText] = useState<string>('Ready');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'table' | 'polars_ascii' | 'schema'>('table');
  const [asciiTable, setAsciiTable] = useState<string>('');
  const [duckDbReady, setDuckDbReady] = useState<boolean>(false);

  const duckDbRef = useRef<any>(null);
  const connRef = useRef<any>(null);

  // Initialize DuckDB-WASM client-side without auto-running queries
  useEffect(() => {
    let isMounted = true;

    async function initDuckDB() {
      try {
        setStatusText('Initializing DuckDB-WASM...');
        const duckdb = await import('@duckdb/duckdb-wasm');
        const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
        const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

        const worker_url = URL.createObjectURL(
          new Blob([`importScripts("${bundle.mainWorker!}");`], { type: 'text/javascript' })
        );

        const worker = new Worker(worker_url);
        const logger = new duckdb.ConsoleLogger();
        const db = new duckdb.AsyncDuckDB(logger, worker);
        await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
        URL.revokeObjectURL(worker_url);

        const conn = await db.connect();

        // Register in-memory tables
        await db.registerFileText('about.json', JSON.stringify(aboutData));
        await conn.query(`CREATE TABLE about AS SELECT * FROM read_json_auto('about.json')`);

        await db.registerFileText('experience.json', JSON.stringify(careerData));
        await conn.query(`CREATE TABLE experience AS SELECT * FROM read_json_auto('experience.json')`);

        await db.registerFileText('education.json', JSON.stringify(educationData));
        await conn.query(`CREATE TABLE education AS SELECT * FROM read_json_auto('education.json')`);

        await db.registerFileText('research.json', JSON.stringify(researchData));
        await conn.query(`CREATE TABLE research AS SELECT * FROM read_json_auto('research.json')`);

        await db.registerFileText('skills.json', JSON.stringify(skillsData));
        await conn.query(`CREATE TABLE skills AS SELECT * FROM read_json_auto('skills.json')`);

        if (isMounted) {
          duckDbRef.current = db;
          connRef.current = conn;
          setDuckDbReady(true);
          setStatusText('DuckDB-WASM Active');
        }
      } catch (err: any) {
        console.warn('DuckDB-WASM fallback to client engine:', err);
        if (isMounted) {
          setDuckDbReady(false);
          setStatusText('In-Memory Engine');
        }
      }
    }

    initDuckDB();

    return () => {
      isMounted = false;
      if (connRef.current) connRef.current.close().catch(() => {});
    };
  }, []);

  // Format Polars-style ASCII dataframe table
  function generatePolarsAscii(rows: Record<string, any>[], cols: string[]): string {
    if (rows.length === 0) return 'shape: (0, 0)\n[empty dataframe]';

    const colWidths: Record<string, number> = {};
    cols.forEach((col) => {
      let maxLen = col.length;
      rows.forEach((row) => {
        const valStr = String(row[col] ?? '');
        if (valStr.length > maxLen) maxLen = Math.min(valStr.length, 36);
      });
      colWidths[col] = Math.max(maxLen, 6);
    });

    const topBorder = '┌' + cols.map((c) => '─'.repeat(colWidths[c] + 2)).join('┬') + '┐';
    const headerRow = '│' + cols.map((c) => ` ${c.padEnd(colWidths[c])} `).join('│') + '│';
    const typeRow = '│' + cols.map((c) => ` ${'str'.padEnd(colWidths[c])} `).join('│') + '│';
    const midBorder = '╞' + cols.map((c) => '═'.repeat(colWidths[c] + 2)).join('╪') + '╡';
    const rowLines = rows.map((row) => {
      return (
        '│' +
        cols
          .map((c) => {
            const raw = String(row[c] ?? '');
            const truncated = raw.length > 36 ? raw.slice(0, 33) + '...' : raw;
            return ` ${truncated.padEnd(colWidths[c])} `;
          })
          .join('│') +
        '│'
      );
    });
    const bottomBorder = '└' + cols.map((c) => '─'.repeat(colWidths[c] + 2)).join('┴') + '┘';

    return `shape: (${rows.length}, ${cols.length})\n${topBorder}\n${headerRow}\n${typeRow}\n${midBorder}\n${rowLines.join('\n')}\n${bottomBorder}`;
  }

  // Fallback SQL runner
  function runFallbackQuery(sqlQuery: string) {
    const t0 = performance.now();
    setErrorText(null);

    try {
      const q = sqlQuery.toLowerCase().trim();
      let data: Record<string, any>[] = [];

      if (q.includes('about')) {
        data = [...aboutData];
      } else if (q.includes('experience') || q.includes('career')) {
        data = [...careerData];
      } else if (q.includes('education')) {
        data = [...educationData];
      } else if (q.includes('research') || q.includes('thesis')) {
        data = [...researchData];
      } else if (q.includes('skills')) {
        data = [...skillsData];
      } else {
        throw new Error('Table not found. Available tables: about, experience, education, research, skills');
      }

      const cols = data.length > 0 ? Object.keys(data[0]) : [];
      const t1 = performance.now();

      setHasExecuted(true);
      setResultRows(data);
      setColumns(cols);
      setExecTimeMs(Math.round((t1 - t0) * 10) / 10);
      setAsciiTable(generatePolarsAscii(data, cols));
      setStatusText('Executed');
    } catch (err: any) {
      setErrorText(err.message || String(err));
      setStatusText('Query error');
    }
  }

  // True DuckDB-WASM query execution
  async function runSqlQuery(sqlQuery: string, activeConn = connRef.current) {
    if (!activeConn) {
      runFallbackQuery(sqlQuery);
      return;
    }

    const t0 = performance.now();
    setErrorText(null);

    try {
      const result = await activeConn.query(sqlQuery);
      const rows = result.toArray().map((row: any) => row.toJSON());
      const cols = result.schema.fields.map((f: any) => f.name);
      const t1 = performance.now();

      setHasExecuted(true);
      setResultRows(rows);
      setColumns(cols);
      setExecTimeMs(Math.round((t1 - t0) * 10) / 10);
      setAsciiTable(generatePolarsAscii(rows, cols));
      setStatusText(`Query executed in ${Math.round((t1 - t0) * 10) / 10}ms`);
    } catch (err: any) {
      console.warn('DuckDB query error:', err);
      setErrorText(err.message || String(err));
      setStatusText('Execution failed');
    }
  }

  // Polars Method-Chaining Parser
  function runPolarsQuery(polarsExpr: string) {
    const t0 = performance.now();
    setErrorText(null);

    try {
      let data: Record<string, any>[] = [];
      const expr = polarsExpr.trim();

      if (expr.startsWith('about')) {
        data = [...aboutData];
      } else if (expr.startsWith('experience')) {
        data = [...careerData];
      } else if (expr.startsWith('education')) {
        data = [...educationData];
      } else if (expr.startsWith('research')) {
        data = [...researchData];
      } else if (expr.startsWith('skills')) {
        data = [...skillsData];
      } else {
        throw new Error('Unknown DataFrame. Use about, experience, education, research, or skills.');
      }

      // Parse .select(["col1", "col2"])
      const selectMatch = expr.match(/\.select\(\[([^\]]+)\]\)/);
      let cols = data.length > 0 ? Object.keys(data[0]) : [];

      if (selectMatch && selectMatch[1]) {
        const selectedCols = selectMatch[1]
          .split(',')
          .map((s) => s.trim().replace(/['"]/g, ''));
        cols = selectedCols;
        data = data.map((row) => {
          const newRow: Record<string, any> = {};
          selectedCols.forEach((c) => {
            if (c in row) newRow[c] = row[c];
          });
          return newRow;
        });
      }

      const t1 = performance.now();
      setHasExecuted(true);
      setResultRows(data);
      setColumns(cols);
      setExecTimeMs(Math.round((t1 - t0) * 10) / 10);
      setAsciiTable(generatePolarsAscii(data, cols));
      setStatusText(`Polars execution in ${Math.round((t1 - t0) * 10) / 10}ms`);
    } catch (err: any) {
      setErrorText(err.message || String(err));
      setStatusText('Parse error');
    }
  }

  function handleExecute() {
    if (mode === 'sql') {
      runSqlQuery(query);
    } else {
      runPolarsQuery(query);
    }
  }

  function handleSelectPreset(preset: QueryPreset) {
    const nextQuery = mode === 'sql' ? preset.sql : preset.polars;
    setQuery(nextQuery);
  }

  function handleModeChange(newMode: QueryMode) {
    setMode(newMode);
    const matchingPreset = PRESETS.find(
      (p) => p.sql === query || p.polars === query
    ) || PRESETS[0];

    const nextQuery = newMode === 'sql' ? matchingPreset.sql : matchingPreset.polars;
    setQuery(nextQuery);
  }

  function handleReset() {
    const def = PRESETS[0];
    setQuery(mode === 'sql' ? def.sql : def.polars);
  }

  return (
    <div className="w-full rounded-2xl border border-[#232836] bg-[#0c0e14] shadow-2xl overflow-hidden">
      {/* Console Top Chrome Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#232836] bg-[#11141d] px-4 py-3 gap-3">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80 border border-red-600/40"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/80 border border-yellow-600/40"></div>
          <div className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-600/40"></div>
          <span className="text-xs font-mono text-slate-400 ml-2 font-medium">harry_zhong.duckdb</span>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center bg-[#080a0f] p-1 rounded-lg border border-[#232836]">
          <button
            onClick={() => handleModeChange('sql')}
            className={`px-3 py-1 rounded text-xs font-mono font-medium transition-all ${
              mode === 'sql'
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            SQL (DuckDB-WASM)
          </button>
          <button
            onClick={() => handleModeChange('polars')}
            className={`px-3 py-1 rounded text-xs font-mono font-medium transition-all ${
              mode === 'polars'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Polars (DataFrame)
          </button>
        </div>

        {/* Engine Status */}
        <div className="flex items-center space-x-2">
          <span className={`inline-block w-2 h-2 rounded-full ${duckDbReady ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
          <span className="text-xs font-mono text-slate-400">
            {duckDbReady ? 'DuckDB-WASM Active' : 'In-Memory Engine'}
          </span>
        </div>
      </div>

      {/* Preset Chips */}
      <div className="px-4 py-2.5 bg-[#0e111a] border-b border-[#232836]/60 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-slate-500 font-mono text-[11px] uppercase tracking-wider whitespace-nowrap">
          Presets:
        </span>
        {PRESETS.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => handleSelectPreset(preset)}
            className="px-2.5 py-1 rounded-md bg-[#161a26] hover:bg-[#1f2436] text-slate-300 hover:text-white border border-[#272f44] whitespace-nowrap transition-colors font-mono text-[11px]"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Query Code Editor Area */}
      <div className="relative border-b border-[#232836] bg-[#090b10]">
        <div className="flex items-start">
          <div className="select-none font-mono text-xs text-slate-600 px-3.5 py-3 text-right bg-[#0b0d13] border-r border-[#232836]/40">
            &gt;
          </div>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                handleExecute();
              }
            }}
            rows={2}
            className="w-full font-mono text-xs text-emerald-300 bg-transparent px-3 py-3 focus:outline-none resize-none leading-relaxed"
            placeholder={
              mode === 'sql'
                ? 'SELECT * FROM about;'
                : 'about'
            }
          />
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#0d1017] border-t border-[#232836]/40">
          <div className="text-[11px] font-mono text-slate-500">
            Press <kbd className="px-1.5 py-0.5 rounded bg-[#1c2233] text-slate-300 border border-[#2e3752]">⌘ + Enter</kbd> to execute
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleReset}
              className="px-3 py-1 rounded text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-[#1a2030] transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleExecute}
              className="px-4 py-1.5 rounded-md bg-sky-500 hover:bg-sky-400 text-slate-950 font-mono text-xs font-semibold shadow-md shadow-sky-500/10 transition-all"
            >
              Run Query
            </button>
          </div>
        </div>
      </div>

      {/* Output Tabs & Execution Metadata */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#232836] bg-[#0e111a] px-4 py-2">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('table')}
            className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
              activeTab === 'table'
                ? 'bg-[#1e2436] text-white font-medium'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Table View {hasExecuted ? `(${resultRows.length})` : ''}
          </button>
          <button
            onClick={() => setActiveTab('polars_ascii')}
            className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
              activeTab === 'polars_ascii'
                ? 'bg-[#1e2436] text-white font-medium'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Polars ASCII
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
              activeTab === 'schema'
                ? 'bg-[#1e2436] text-white font-medium'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Schema Catalog
          </button>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono text-slate-400">
          {execTimeMs !== null && (
            <span className="text-emerald-400">{execTimeMs} ms</span>
          )}
          {execTimeMs !== null && <span className="text-slate-600">|</span>}
          <span className="text-slate-400">{statusText}</span>
        </div>
      </div>

      {/* Error Message */}
      {errorText && (
        <div className="px-4 py-2 bg-red-950/40 border-b border-red-800/40 text-red-300 font-mono text-xs flex items-center justify-between">
          <span>Error: {errorText}</span>
          <button onClick={() => setErrorText(null)} className="text-red-400 hover:text-red-200">
            Dismiss
          </button>
        </div>
      )}

      {/* Viewport */}
      <div className="min-h-[280px] max-h-[500px] overflow-auto bg-[#08090d] font-mono text-xs">
        {activeTab === 'table' && (
          hasExecuted ? (
            resultRows.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#111520] border-b border-[#232836] sticky top-0">
                      {columns.map((col, idx) => (
                        <th
                          key={idx}
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
                        {columns.map((col, cIdx) => {
                          const val = row[col];
                          const isLink = typeof val === 'string' && val.startsWith('http');
                          return (
                            <td key={cIdx} className="px-4 py-3 whitespace-nowrap text-slate-300">
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
                                String(val ?? '')
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
                Click <span className="text-sky-400 font-semibold">Run Query</span> or press <kbd className="px-1.5 py-0.5 rounded bg-[#1c2233] text-slate-300 border border-[#2e3752]">⌘ + Enter</kbd> to view results
              </div>
            </div>
          )
        )}

        {activeTab === 'polars_ascii' && (
          hasExecuted ? (
            <pre className="p-4 text-emerald-400/90 leading-tight font-mono text-[11px] whitespace-pre overflow-x-auto select-all">
              {asciiTable}
            </pre>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-2">
              <div className="text-xs font-mono text-slate-400">Query ready to execute.</div>
              <div className="text-[11px] font-mono text-slate-500">
                Click <span className="text-emerald-400 font-semibold">Run Query</span> to format as Polars DataFrame
              </div>
            </div>
          )
        )}

        {activeTab === 'schema' && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300">
            <div className="p-3 rounded-lg border border-[#232836] bg-[#0f121a]">
              <div className="font-semibold text-sky-400 mb-1">about</div>
              <p className="text-slate-400 text-[11px] mb-2">Profile overview and contact.</p>
              <div className="flex flex-wrap gap-1 text-[11px]">
                {['name: str', 'location: str', 'contact: str'].map((f) => (
                  <span key={f} className="px-1.5 py-0.5 rounded bg-[#171b26] border border-[#272f44] text-slate-300">
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-[#232836] bg-[#0f121a]">
              <div className="font-semibold text-sky-400 mb-1">experience</div>
              <p className="text-slate-400 text-[11px] mb-2">Roles, companies, dates, and domains.</p>
              <div className="flex flex-wrap gap-1 text-[11px]">
                {['company: str', 'role: str', 'period: str', 'domain: str'].map((f) => (
                  <span key={f} className="px-1.5 py-0.5 rounded bg-[#171b26] border border-[#272f44] text-slate-300">
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-[#232836] bg-[#0f121a]">
              <div className="font-semibold text-sky-400 mb-1">education</div>
              <p className="text-slate-400 text-[11px] mb-2">Academic degrees.</p>
              <div className="flex flex-wrap gap-1 text-[11px]">
                {['institution: str', 'qualification: str', 'period: str', 'details: str'].map((f) => (
                  <span key={f} className="px-1.5 py-0.5 rounded bg-[#171b26] border border-[#272f44] text-slate-300">
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-[#232836] bg-[#0f121a]">
              <div className="font-semibold text-sky-400 mb-1">research</div>
              <p className="text-slate-400 text-[11px] mb-2">Honours thesis publication and stochastic modeling.</p>
              <div className="flex flex-wrap gap-1 text-[11px]">
                {['title: str', 'institution: str', 'degree: str', 'year: str', 'domain: str', 'link: str'].map((f) => (
                  <span key={f} className="px-1.5 py-0.5 rounded bg-[#171b26] border border-[#272f44] text-slate-300">
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-[#232836] bg-[#0f121a]">
              <div className="font-semibold text-sky-400 mb-1">skills</div>
              <p className="text-slate-400 text-[11px] mb-2">Languages, libraries, domains, and cloud tools.</p>
              <div className="flex flex-wrap gap-1 text-[11px]">
                {['category: str', 'items: str'].map((f) => (
                  <span key={f} className="px-1.5 py-0.5 rounded bg-[#171b26] border border-[#272f44] text-slate-300">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
