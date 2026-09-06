import React, { useState, useEffect, useRef } from 'react';
import aboutData from '../data/about.json';
import careerData from '../data/career.json';
import educationData from '../data/education.json';
import researchData from '../data/research.json';

type QueryMode = 'sql' | 'polars';

interface QueryPreset {
  label: string;
  sql: string;
  polars: string;
}

const SCHEMA_TABLES = [
  {
    name: 'about',
    description: 'Profile overview and contact',
    columns: ['name: str', 'location: str', 'contact: str'],
  },
  {
    name: 'experience',
    description: 'Employment timeline and domains',
    columns: ['company: str', 'role: str', 'period: str', 'domain: str'],
  },
  {
    name: 'education',
    description: 'Degrees and qualifications',
    columns: ['institution: str', 'qualification: str', 'period: str', 'details: str'],
  },
  {
    name: 'research',
    description: 'Academic thesis and papers',
    columns: ['title: str', 'institution: str', 'degree: str', 'year: str', 'domain: str', 'link: str'],
  },
];

const PRESETS: QueryPreset[] = [
  {
    label: 'About Me',
    sql: 'SELECT name, location, contact FROM about;',
    polars: 'about.select(["name", "location", "contact"])',
  },
  {
    label: 'Experience',
    sql: 'SELECT role, company, period, domain FROM experience;',
    polars: 'experience.select(["role", "company", "period", "domain"])',
  },
  {
    label: 'Education × Research (Join)',
    sql: `SELECT 
  e.institution,
  e.qualification,
  r.title AS thesis_title,
  r.link
FROM education e
INNER JOIN research r 
  ON e.institution = r.institution;`,
    polars: `education.join(research, on="institution").select([
  "institution", "qualification", "title", "link"
])`,
  },
  {
    label: 'Unified Timeline (Union)',
    sql: `WITH timeline AS (
  SELECT company AS organization, role AS title, period, 'Industry' AS track FROM experience
  UNION ALL
  SELECT institution AS organization, qualification AS title, period, 'Academic' AS track FROM education
)
SELECT * FROM timeline;`,
    polars: `pl.concat([
  experience.select([
    pl.col("company").alias("organization"),
    pl.col("role").alias("title"),
    "period",
    pl.lit("Industry").alias("track"),
  ]),
  education.select([
    pl.col("institution").alias("organization"),
    pl.col("qualification").alias("title"),
    "period",
    pl.lit("Academic").alias("track"),
  ]),
])`,
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
  const [duckDbReady, setDuckDbReady] = useState<boolean>(false);
  const [isSchemaOpen, setIsSchemaOpen] = useState<boolean>(false);
  const [isClosed, setIsClosed] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const duckDbRef = useRef<any>(null);
  const connRef = useRef<any>(null);

  // Fullscreen escape key listener & scroll lock
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    }
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  // Initialize DuckDB-WASM client-side
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

  // Fallback SQL runner
  function runFallbackQuery(sqlQuery: string) {
    const t0 = performance.now();
    setErrorText(null);

    try {
      const q = sqlQuery.toLowerCase().trim();
      let data: Record<string, any>[] = [];

      if (q.includes('join')) {
        data = educationData
          .filter((e) => researchData.some((r) => r.institution === e.institution))
          .map((e) => {
            const r = researchData.find((res) => res.institution === e.institution);
            return {
              institution: e.institution,
              qualification: e.qualification,
              thesis_title: r ? r.title : '',
              link: r ? r.link : '',
            };
          });
      } else if (q.includes('group by') || q.includes('string_agg')) {
        const map: Record<string, { company: string; roles_held: number; roles: string[] }> = {};
        for (const exp of careerData) {
          if (!map[exp.company]) {
            map[exp.company] = { company: exp.company, roles_held: 0, roles: [] };
          }
          map[exp.company].roles_held += 1;
          map[exp.company].roles.push(exp.role);
        }
        data = Object.values(map)
          .sort((a, b) => b.roles_held - a.roles_held)
          .map((g) => ({
            company: g.company,
            roles_held: g.roles_held,
            career_path: g.roles.join(' ← '),
          }));
      } else if (q.includes('union') || q.includes('timeline')) {
        data = [
          ...careerData.map((c) => ({ organization: c.company, title: c.role, period: c.period, track: 'Industry' })),
          ...educationData.map((e) => ({ organization: e.institution, title: e.qualification, period: e.period, track: 'Academic' })),
        ];
      } else if (q.includes('about')) {
        data = [...aboutData];
      } else if (q.includes('experience') || q.includes('career')) {
        data = [...careerData];
      } else if (q.includes('education')) {
        data = [...educationData];
      } else if (q.includes('research') || q.includes('thesis')) {
        data = [...researchData];
      } else {
        throw new Error('Table not found. Available tables: about, experience, education, research');
      }

      const cols = data.length > 0 ? Object.keys(data[0]) : [];
      const t1 = performance.now();

      setHasExecuted(true);
      setResultRows(data);
      setColumns(cols);
      setExecTimeMs(Math.round((t1 - t0) * 10) / 10);
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

      if (expr.includes('join')) {
        data = educationData
          .filter((e) => researchData.some((r) => r.institution === e.institution))
          .map((e) => {
            const r = researchData.find((res) => res.institution === e.institution);
            return {
              institution: e.institution,
              qualification: e.qualification,
              title: r ? r.title : '',
              link: r ? r.link : '',
            };
          });
      } else if (expr.includes('group_by')) {
        const map: Record<string, { company: string; roles_held: number; roles: string[] }> = {};
        for (const exp of careerData) {
          if (!map[exp.company]) {
            map[exp.company] = { company: exp.company, roles_held: 0, roles: [] };
          }
          map[exp.company].roles_held += 1;
          map[exp.company].roles.push(exp.role);
        }
        data = Object.values(map)
          .sort((a, b) => b.roles_held - a.roles_held)
          .map((g) => ({
            company: g.company,
            roles_held: g.roles_held,
            career_path: g.roles.join(' ← '),
          }));
      } else if (expr.includes('concat')) {
        data = [
          ...careerData.map((c) => ({
            organization: c.company,
            title: c.role,
            period: c.period,
            track: 'Industry',
          })),
          ...educationData.map((e) => ({
            organization: e.institution,
            title: e.qualification,
            period: e.period,
            track: 'Academic',
          })),
        ];
      } else if (expr.startsWith('about')) {
        data = [...aboutData];
      } else if (expr.startsWith('experience')) {
        data = [...careerData];
      } else if (expr.startsWith('education')) {
        data = [...educationData];
      } else if (expr.startsWith('research')) {
        data = [...researchData];
      } else {
        throw new Error('Unknown DataFrame. Use about, experience, education, or research.');
      }

      let cols = data.length > 0 ? Object.keys(data[0]) : [];

      // Only parse trailing .select(["col1", "col2"]) on simple datasets
      if (!expr.includes('concat') && !expr.includes('group_by')) {
        const selectMatch = expr.match(/\.select\(\[([^\]]+)\]\)$/);
        if (selectMatch && selectMatch[1] && !selectMatch[1].includes('(')) {
          const selectedCols = selectMatch[1]
            .split(',')
            .map((s) => s.trim().replace(/['"]/g, ''));
          if (selectedCols.length > 0) {
            cols = selectedCols;
            data = data.map((row) => {
              const newRow: Record<string, any> = {};
              selectedCols.forEach((c) => {
                if (c in row) newRow[c] = row[c];
              });
              return newRow;
            });
          }
        }
      }

      const t1 = performance.now();
      setHasExecuted(true);
      setResultRows(data);
      setColumns(cols);
      setExecTimeMs(Math.round((t1 - t0) * 10) / 10);
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

  function handleTableClick(tableName: string) {
    const nextQuery = mode === 'sql' ? `SELECT * FROM ${tableName};` : tableName;
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

  if (isClosed) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-12 px-4 animate-fadeIn">
        <div className="w-full max-w-md rounded-2xl border border-[#232836] bg-[#0c0e14] p-6 shadow-2xl text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
            <span className="text-xs font-mono text-slate-400 font-medium">Terminal session closed</span>
          </div>
          <p className="text-xs text-slate-500 font-mono leading-relaxed">
            Process exited with code 0. Reconnect to launch DuckDB-WASM and restore interactive session.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setIsClosed(false)}
              className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-mono text-xs font-semibold shadow-md shadow-sky-500/10 transition-all inline-flex items-center space-x-2 cursor-pointer"
            >
              <span>Reopen Session</span>
              <span>↵</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {isFullscreen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
          onClick={() => setIsFullscreen(false)}
        />
      )}

      <div
        className={`${
          isFullscreen
            ? 'fixed inset-3 md:inset-6 z-50 rounded-2xl border border-[#2e3752] bg-[#0c0e14] shadow-2xl overflow-hidden flex flex-col'
            : 'w-full rounded-2xl border border-[#232836] bg-[#0c0e14] shadow-2xl overflow-hidden transition-all duration-300'
        }`}
      >
        {/* Console Top Chrome Bar */}
        <div
          className={`flex flex-wrap items-center justify-between border-b border-[#232836] bg-[#11141d] px-4 py-3 gap-3 ${
            isMinimized ? 'cursor-pointer hover:bg-[#151924] transition-colors' : ''
          }`}
          onClick={(e) => {
            if (isMinimized && (e.target as HTMLElement).tagName !== 'BUTTON') {
              setIsMinimized(false);
            }
          }}
        >
          <div className="group/traffic flex items-center space-x-2 py-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsClosed(true);
                setIsMinimized(false);
                setIsFullscreen(false);
              }}
              className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 border border-red-600/50 flex items-center justify-center transition-colors focus:outline-none cursor-pointer"
              title="Close window"
              aria-label="Close window"
            >
              <span className="text-[8px] font-bold text-red-950 opacity-0 group-hover/traffic:opacity-100 transition-opacity leading-none select-none">
                ✕
              </span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(!isMinimized);
                if (isFullscreen) setIsFullscreen(false);
              }}
              className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 border border-yellow-600/50 flex items-center justify-center transition-colors focus:outline-none cursor-pointer"
              title={isMinimized ? 'Restore window' : 'Minimize window'}
              aria-label={isMinimized ? 'Restore window' : 'Minimize window'}
            >
              <span className="text-[8px] font-bold text-yellow-950 opacity-0 group-hover/traffic:opacity-100 transition-opacity leading-none select-none">
                −
              </span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsFullscreen(!isFullscreen);
                if (isMinimized) setIsMinimized(false);
              }}
              className="w-3 h-3 rounded-full bg-emerald-500/80 hover:bg-emerald-500 border border-emerald-600/50 flex items-center justify-center transition-colors focus:outline-none cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen Studio'}
              aria-label={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen Studio'}
            >
              <span className="text-[7px] font-bold text-emerald-950 opacity-0 group-hover/traffic:opacity-100 transition-opacity leading-none select-none">
                {isFullscreen ? '⤦' : '⤢'}
              </span>
            </button>
            <span className="text-xs font-mono text-slate-400 ml-2 font-medium">harry_zhong.duckdb</span>
            {isMinimized && (
              <span className="text-[11px] font-mono text-slate-500 italic ml-1">(minimized · click to restore)</span>
            )}
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

          {/* Engine Status & Fullscreen Hint */}
          <div className="flex items-center space-x-3">
            {isFullscreen && (
              <span className="hidden sm:inline-block text-[11px] font-mono text-slate-500">
                Press <kbd className="px-1 py-0.5 rounded bg-[#161a26] text-slate-300 border border-[#272f44]">Esc</kbd> to exit
              </span>
            )}
            <div className="flex items-center space-x-2">
              <span className={`inline-block w-2 h-2 rounded-full ${duckDbReady ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span className="text-xs font-mono text-slate-400">
                {duckDbReady ? 'DuckDB-WASM Active' : 'In-Memory Engine'}
              </span>
            </div>
          </div>
        </div>

        {/* Main Studio Body: Schema Sidebar + Query/Results Panel */}
        {!isMinimized && (
          <div className={`flex flex-col md:flex-row ${isFullscreen ? 'flex-1 min-h-0' : 'min-h-[440px]'}`}>
        {/* Mobile Schema Accordion Header */}
        <div className="md:hidden border-b border-[#232836] bg-[#0b0d13]">
          <button
            onClick={() => setIsSchemaOpen(!isSchemaOpen)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span className="flex items-center space-x-2">
              <span className={`text-[10px] text-sky-400 transition-transform duration-200 ${isSchemaOpen ? 'rotate-90' : ''}`}>
                ▶
              </span>
              <span className="font-medium uppercase tracking-wider text-[11px] text-slate-300">Schema Catalog</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#161a26] text-slate-400 border border-[#272f44]">
              4 tables
            </span>
          </button>
          <div
            className={`overflow-hidden transition-all duration-200 ease-in-out ${
              isSchemaOpen ? 'max-h-96 p-3 border-t border-[#1c2233]' : 'max-h-0'
            }`}
          >
            <div className="space-y-3">
              {SCHEMA_TABLES.map((tbl) => (
                <div key={tbl.name}>
                  <button
                    onClick={() => handleTableClick(tbl.name)}
                    className="text-left font-mono text-xs font-medium text-sky-400 hover:text-sky-300 mb-1"
                  >
                    ▶ {tbl.name}
                  </button>
                  <div className="pl-3 flex flex-wrap gap-1">
                    {tbl.columns.map((col) => (
                      <span
                        key={col}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#161a26] border border-[#272f44] text-slate-400"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Schema Catalog Sidebar (Smooth Symmetrical Collapse/Expand) */}
        <aside
          className={`hidden md:flex flex-col justify-between shrink-0 border-r border-[#232836] bg-[#0b0d13] transition-[width] duration-200 ease-in-out overflow-hidden relative ${
            isSchemaOpen ? 'w-60' : 'w-10'
          }`}
        >
          {/* Collapsed Rail View */}
          <div
            className={`absolute inset-0 flex flex-col items-center py-3 select-none transition-opacity duration-150 ${
              isSchemaOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <button
              onClick={() => setIsSchemaOpen(true)}
              className="p-1.5 rounded hover:bg-[#161a26] text-slate-400 hover:text-sky-400 transition-colors"
              title="Expand Schema Catalog"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={() => setIsSchemaOpen(true)}
              className="mt-6 text-slate-500 hover:text-slate-300 font-mono text-[10px] uppercase tracking-widest [writing-mode:vertical-rl] rotate-180 py-2 transition-colors cursor-pointer"
              title="Expand Schema Catalog"
            >
              Schema (4)
            </button>
          </div>

          {/* Expanded Catalog View */}
          <div
            className={`w-60 p-3 h-full flex flex-col justify-between transition-opacity duration-200 ${
              isSchemaOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div>
              <div className="flex items-center justify-between px-2 py-1 mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  Schema Catalog
                </span>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#161a26] text-slate-400 border border-[#272f44]">
                    4 tables
                  </span>
                  <button
                    onClick={() => setIsSchemaOpen(false)}
                    className="p-1 rounded hover:bg-[#161a26] text-slate-500 hover:text-slate-300 transition-colors"
                    title="Collapse Schema Catalog"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {SCHEMA_TABLES.map((tbl) => (
                  <div key={tbl.name} className="group">
                    <button
                      onClick={() => handleTableClick(tbl.name)}
                      className="w-full text-left flex items-center justify-between px-2 py-1 rounded hover:bg-[#151926] text-sky-400 hover:text-sky-300 font-mono text-xs font-medium transition-colors"
                      title={`Click to query ${tbl.name}`}
                    >
                      <span className="flex items-center space-x-1.5">
                        <span className="text-slate-500 text-[10px]">▶</span>
                        <span>{tbl.name}</span>
                      </span>
                      <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        select
                      </span>
                    </button>

                    <div className="pl-4 pr-1 py-1 space-y-0.5">
                      {tbl.columns.map((col) => (
                        <div
                          key={col}
                          className="text-[11px] font-mono text-slate-400 hover:text-slate-200 transition-colors truncate"
                        >
                          {col}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-[#1c2233] px-2 text-[10px] font-mono text-slate-500">
              Click table to load query
            </div>
          </div>
        </aside>

        {/* Query & Results Main Panel */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0c0e14]">
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
                rows={Math.min(Math.max(query.split('\n').length, 2), 8)}
                className="w-full font-mono text-xs text-emerald-300 bg-transparent px-3 py-3 focus:outline-none resize-none leading-relaxed"
                placeholder={mode === 'sql' ? 'SELECT name, location, contact FROM about;' : 'about.select(["name", "location", "contact"])'}
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

          {/* Results Status Header */}
          <div className="flex items-center justify-between border-b border-[#232836] bg-[#0e111a] px-4 py-2 text-xs font-mono">
            <span className="text-slate-300 font-medium">
              Results {hasExecuted ? `(${resultRows.length} ${resultRows.length === 1 ? 'row' : 'rows'})` : ''}
            </span>

            <div className="flex items-center space-x-3 text-slate-400">
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
            )}
          </div>
        </div>
      </div>
    )}
  </div>
</>
  );
}
