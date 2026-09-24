import { useCallback, useEffect, useRef, useState } from 'react';
import aboutData from '../../data/about.json';
import careerData from '../../data/career.json';
import educationData from '../../data/education.json';
import researchData from '../../data/research.json';
import { CORE_TABLES } from './achievements';
import { executeFallbackQuery } from './fallbackEngine';
import { SCHEMA_TABLES } from './presets';
import type { TableSchema } from './types';
import { useAchievements } from './useAchievements';

function formatDuckDbType(dataType: string): string {
  const dt = dataType.toUpperCase();
  if (dt.includes('VARCHAR') || dt.includes('TEXT') || dt.includes('CHAR')) return 'str';
  if (dt.includes('INT')) return 'int';
  if (dt.includes('FLOAT') || dt.includes('DOUBLE') || dt.includes('DECIMAL')) return 'float';
  if (dt.includes('DATE') || dt.includes('TIMESTAMP')) return 'date';
  if (dt.includes('BOOL')) return 'bool';
  return dataType.toLowerCase();
}

const TABLE_PRIORITY: Record<string, number> = {
  about: 1,
  experience: 2,
  education: 3,
  research: 4,
};

const TABLE_DESCRIPTIONS: Record<string, string> = {
  about: 'Profile overview and contact',
  experience: 'Employment timeline and domains',
  education: 'Degrees and qualifications',
  research: 'Academic thesis and papers',
};

const ARTIFICIAL_DELAY_MIN_MS = 300;
const ARTIFICIAL_DELAY_VARIANCE_MS = 100;

function simulateLatency(
  minMs = ARTIFICIAL_DELAY_MIN_MS,
  varianceMs = ARTIFICIAL_DELAY_VARIANCE_MS
): Promise<void> {
  const ms = Math.floor(minMs + Math.random() * varianceMs);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const TABLE_FILES = [
  { name: 'about', filename: 'about.json', data: aboutData },
  { name: 'experience', filename: 'experience.json', data: careerData },
  { name: 'education', filename: 'education.json', data: educationData },
  { name: 'research', filename: 'research.json', data: researchData },
] as const;

const INIT_TABLES_SQL = TABLE_FILES.map(
  (t) => `CREATE TABLE IF NOT EXISTS ${t.name} AS SELECT * FROM read_json_auto('${t.filename}');`
).join('\n');

async function fetchDynamicSchemas(conn: any): Promise<TableSchema[]> {
  const res = await conn.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'main' 
    ORDER BY table_name, ordinal_position;
  `);

  const rows = res
    .toArray()
    .map((r: any) => (typeof r.toJSON === 'function' ? r.toJSON() : { ...r }));
  const tableMap = new Map<string, { name: string; columns: string[] }>();

  for (const row of rows) {
    const tblName = String(row.table_name);
    const colName = String(row.column_name);
    const colType = formatDuckDbType(String(row.data_type || ''));

    if (!tableMap.has(tblName)) {
      tableMap.set(tblName, { name: tblName, columns: [] });
    }
    tableMap.get(tblName)!.columns.push(`${colName}: ${colType}`);
  }

  return Array.from(tableMap.values())
    .sort((a, b) => {
      const pA = TABLE_PRIORITY[a.name] ?? 99;
      const pB = TABLE_PRIORITY[b.name] ?? 99;
      if (pA !== pB) return pA - pB;
      return a.name.localeCompare(b.name);
    })
    .map((tbl) => ({
      name: tbl.name,
      description: TABLE_DESCRIPTIONS[tbl.name] || 'Custom table',
      columns: tbl.columns,
    }));
}

export function useQueryEngine() {
  const [hasExecuted, setHasExecuted] = useState<boolean>(false);
  const [resultRows, setResultRows] = useState<Record<string, any>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [tableSchemas, setTableSchemas] = useState<TableSchema[]>(SCHEMA_TABLES);
  const [execTimeMs, setExecTimeMs] = useState<number | null>(null);
  const [statusText, setStatusText] = useState<string>('Initializing DuckDB-WASM...');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [duckDbReady, setDuckDbReady] = useState<boolean>(false);
  const [engineReady, setEngineReady] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  const duckDbRef = useRef<any>(null);
  const connRef = useRef<any>(null);
  const isExecutingRef = useRef<boolean>(false);
  const prevMissingCountRef = useRef<number>(0);

  const { activeAchievement, triggerAchievement, dismissAchievement } = useAchievements();

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
        for (const { filename, data } of TABLE_FILES) {
          await db.registerFileText(filename, JSON.stringify(data));
        }
        await conn.query(INIT_TABLES_SQL);

        // Preload ICU extension and warm up temporal functions
        try {
          await conn.query(`LOAD icu;`);
        } catch {}
        try {
          await conn.query(`SELECT datediff('year', DATE '2000-01-01', CURRENT_DATE);`);
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 200));
          try {
            await conn.query(`SELECT datediff('year', DATE '2000-01-01', CURRENT_DATE);`);
          } catch {}
        }

        if (isMounted) {
          duckDbRef.current = db;
          connRef.current = conn;
          try {
            const dynamicSchemas = await fetchDynamicSchemas(conn);
            if (dynamicSchemas.length > 0) {
              setTableSchemas(dynamicSchemas);
            }
          } catch (schemaErr) {
            console.warn('Failed to fetch dynamic schemas:', schemaErr);
          }
          setDuckDbReady(true);
          setEngineReady(true);
          setStatusText('DuckDB-WASM Active');
        }
      } catch (err: any) {
        console.warn('DuckDB-WASM fallback to client engine:', err);
        if (isMounted) {
          setDuckDbReady(false);
          setEngineReady(true);
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
  const runFallbackQuery = useCallback(async (sqlQuery: string) => {
    setIsExecuting(true);
    isExecutingRef.current = true;
    setErrorText(null);
    setStatusText('Executing SQL query...');

    const t0 = performance.now();
    await simulateLatency();

    try {
      const { rows, columns: cols } = executeFallbackQuery(sqlQuery);
      const t1 = performance.now();

      setHasExecuted(true);
      setResultRows(rows);
      setColumns(cols);
      setExecTimeMs(Math.round((t1 - t0) * 10) / 10);
      setStatusText(`Query executed in ${Math.round((t1 - t0) * 10) / 10}ms`);
    } catch (err: any) {
      setErrorText(err.message || String(err));
      setStatusText('Query error');
      setHasExecuted(false);
      setResultRows([]);
      setColumns([]);
      setExecTimeMs(null);
    } finally {
      setIsExecuting(false);
      isExecutingRef.current = false;
    }
  }, []);

  const restoreDatabase = useCallback(async () => {
    const conn = connRef.current;
    if (!conn) return;

    setIsExecuting(true);
    isExecutingRef.current = true;
    setErrorText(null);
    setStatusText('Restoring database from immutable snapshot...');

    const t0 = performance.now();
    try {
      await Promise.all([conn.query(INIT_TABLES_SQL), simulateLatency()]);

      const updatedSchemas = await fetchDynamicSchemas(conn);
      setTableSchemas(updatedSchemas);

      const t1 = performance.now();
      const execTime = Math.round((t1 - t0) * 10) / 10;
      setExecTimeMs(execTime);
      setStatusText(`Database restored from snapshot (${execTime}ms)`);
      prevMissingCountRef.current = 0;
      triggerAchievement('cold_reboot');
    } catch (err: any) {
      console.warn('Failed to restore database:', err);
      const rawMsg = err?.message || String(err);
      setErrorText(rawMsg.replace(/^Error:\s*/i, ''));
      setStatusText('Restore error');
    } finally {
      setIsExecuting(false);
      isExecutingRef.current = false;
    }
  }, [triggerAchievement]);

  // True DuckDB-WASM query execution
  const runSqlQuery = useCallback(
    async (sqlQuery: string) => {
      const activeConn = connRef.current;
      if (!activeConn) {
        await runFallbackQuery(sqlQuery);
        return;
      }

      setIsExecuting(true);
      isExecutingRef.current = true;
      setErrorText(null);
      setStatusText('Planning & executing DuckDB query...');

      const t0 = performance.now();

      try {
        let result: any;
        try {
          const [res] = await Promise.all([activeConn.query(sqlQuery), simulateLatency()]);
          result = res;
        } catch (firstErr: any) {
          const msg = String(firstErr?.message || firstErr);
          if (
            msg.includes('No function matches') ||
            msg.includes('datediff') ||
            msg.includes('date_diff')
          ) {
            await new Promise((resolve) => setTimeout(resolve, 200));
            result = await activeConn.query(sqlQuery);
          } else {
            throw firstErr;
          }
        }

        const fields = result.schema.fields;
        const dateFieldNames = new Set(
          fields
            .filter((f: any) => {
              const typeStr = String(f.type || '').toLowerCase();
              const typeId = f.type?.typeId;
              return (
                typeId === 8 ||
                typeId === 10 ||
                typeStr.includes('date') ||
                typeStr.includes('timestamp')
              );
            })
            .map((f: any) => f.name)
        );

        const rows = result.toArray().map((row: any) => {
          const obj = typeof row.toJSON === 'function' ? row.toJSON() : { ...row };
          for (const [key, val] of Object.entries(obj)) {
            if (val === null || val === undefined) continue;
            if (dateFieldNames.has(key) || key.toLowerCase().includes('date')) {
              if (val instanceof Date) {
                obj[key] = val.toISOString().split('T')[0];
              } else if (typeof val === 'number') {
                const ms = val > 100000000 ? val : val * 86400000;
                const d = new Date(ms);
                if (!Number.isNaN(d.getTime())) {
                  obj[key] = d.toISOString().split('T')[0];
                }
              } else if (typeof val === 'string' && val.includes('T')) {
                obj[key] = val.split('T')[0];
              }
            } else if (typeof val === 'bigint') {
              obj[key] = Number(val);
            }
          }
          return obj;
        });

        const cols = fields.map((f: any) => f.name);
        const t1 = performance.now();

        setHasExecuted(true);
        setResultRows(rows);
        setColumns(cols);
        setExecTimeMs(Math.round((t1 - t0) * 10) / 10);
        setStatusText(`Query executed in ${Math.round((t1 - t0) * 10) / 10}ms`);

        // Refresh schema catalog if DDL statement was executed (create, drop, alter)
        if (/\b(create|drop|alter)\b/i.test(sqlQuery) && activeConn) {
          try {
            const updatedSchemas = await fetchDynamicSchemas(activeConn);
            setTableSchemas(updatedSchemas);

            const existingNames = new Set(updatedSchemas.map((s) => s.name.toLowerCase()));
            const missing = CORE_TABLES.filter((t) => !existingNames.has(t));
            const prevMissing = prevMissingCountRef.current;
            prevMissingCountRef.current = missing.length;

            if (prevMissing === 0 && missing.length >= 1) {
              triggerAchievement('root_privilege');
            }
            if (missing.length === CORE_TABLES.length && prevMissing < CORE_TABLES.length) {
              triggerAchievement('rm_rf');
            }
            if (prevMissing > 0 && missing.length === 0) {
              triggerAchievement('cold_reboot');
            }
          } catch (schemaErr) {
            console.warn('Failed to refresh dynamic schema:', schemaErr);
          }
        }
      } catch (err: any) {
        console.warn('DuckDB query error:', err);
        const rawMsg = err?.message || String(err);
        const cleanMsg = rawMsg.replace(/^Error:\s*/i, '');
        setErrorText(cleanMsg);
        setStatusText('Query error');
        setHasExecuted(false);
        setResultRows([]);
        setColumns([]);
        setExecTimeMs(null);
      } finally {
        setIsExecuting(false);
        isExecutingRef.current = false;
      }
    },
    [runFallbackQuery, triggerAchievement]
  );

  const executeQuery = useCallback(
    async (query: string) => {
      if (isExecutingRef.current) return;
      await runSqlQuery(query);
    },
    [runSqlQuery]
  );

  const existingTableNames = new Set(tableSchemas.map((s) => s.name.toLowerCase()));
  const missingCoreTables = CORE_TABLES.filter((t) => !existingTableNames.has(t));
  const isDatabaseModified = missingCoreTables.length > 0;

  return {
    duckDbReady,
    engineReady,
    statusText,
    errorText,
    setErrorText,
    hasExecuted,
    resultRows,
    columns,
    execTimeMs,
    isExecuting,
    tableSchemas,
    executeQuery,
    restoreDatabase,
    isDatabaseModified,
    missingCoreTables,
    activeAchievement,
    dismissAchievement,
  };
}
