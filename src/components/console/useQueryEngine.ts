import { useCallback, useEffect, useRef, useState } from 'react';
import aboutData from '../../data/about.json';
import careerData from '../../data/career.json';
import educationData from '../../data/education.json';
import researchData from '../../data/research.json';
import { getAge, getInclusiveMonths } from './dateUtils';
import type { QueryMode } from './types';

export function useQueryEngine() {
  const [hasExecuted, setHasExecuted] = useState<boolean>(false);
  const [resultRows, setResultRows] = useState<Record<string, any>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [execTimeMs, setExecTimeMs] = useState<number | null>(null);
  const [statusText, setStatusText] = useState<string>('Ready');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [duckDbReady, setDuckDbReady] = useState<boolean>(false);

  const duckDbRef = useRef<any>(null);
  const connRef = useRef<any>(null);

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
        await conn.query(
          `CREATE TABLE experience AS SELECT * FROM read_json_auto('experience.json')`
        );

        await db.registerFileText('education.json', JSON.stringify(educationData));
        await conn.query(
          `CREATE TABLE education AS SELECT * FROM read_json_auto('education.json')`
        );

        await db.registerFileText('research.json', JSON.stringify(researchData));
        await conn.query(`CREATE TABLE research AS SELECT * FROM read_json_auto('research.json')`);

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
  const runFallbackQuery = useCallback((sqlQuery: string) => {
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
              start_date: e.start_date,
              end_date: e.end_date,
              thesis_title: r ? r.title : '',
              link: r ? r.link : '',
            };
          });
      } else if (q.includes('group by') || q.includes('roles_held')) {
        const map: Record<string, { company: string; roles_held: number; total_months: number }> =
          {};
        for (const exp of careerData) {
          if (!map[exp.company]) {
            map[exp.company] = { company: exp.company, roles_held: 0, total_months: 0 };
          }
          map[exp.company].roles_held += 1;
          map[exp.company].total_months += getInclusiveMonths(exp.start_date, exp.end_date);
        }
        data = Object.values(map)
          .sort((a, b) => b.total_months - a.total_months)
          .map((g) => ({
            company: g.company,
            roles_held: g.roles_held,
            total_months: g.total_months,
            total_years: Math.round((g.total_months / 12.0) * 10) / 10,
          }));
      } else if (
        q.includes('datediff') ||
        q.includes('months') ||
        q.includes('years') ||
        q.includes('tenure') ||
        q.includes('duration')
      ) {
        data = careerData.map((c) => {
          const months = getInclusiveMonths(c.start_date, c.end_date);
          const years = Math.round((months / 12.0) * 10) / 10;
          return {
            company: c.company,
            role: c.role,
            start_date: c.start_date,
            end_date: c.end_date ?? new Date().toISOString().split('T')[0],
            months,
            years,
          };
        });
      } else if (q.includes('union') || q.includes('timeline')) {
        data = [
          ...careerData.map((c) => ({
            organization: c.company,
            title: c.role,
            track: 'Industry',
            start_date: c.start_date,
            end_date: c.end_date ?? new Date().toISOString().split('T')[0],
            duration_months: getInclusiveMonths(c.start_date, c.end_date),
          })),
          ...educationData.map((e) => ({
            organization: e.institution,
            title: e.qualification,
            track: 'Academic',
            start_date: e.start_date,
            end_date: e.end_date,
            duration_months: getInclusiveMonths(e.start_date, e.end_date),
          })),
        ].sort((a, b) => (b.start_date > a.start_date ? 1 : -1));
      } else if (q.includes('about')) {
        const wantsDob = q.includes('*') || /select\s+[^;]*\bdate_of_birth\s*[,from]/i.test(q);
        if (q.includes('age')) {
          data = aboutData.map((a: any) => {
            const row: Record<string, any> = {
              name: a.name,
              location: a.location,
              contact: a.contact,
            };
            if (wantsDob) row.date_of_birth = a.date_of_birth;
            row.age = getAge(a.date_of_birth);
            return row;
          });
        } else {
          data = [...aboutData];
        }
      } else if (q.includes('experience') || q.includes('career')) {
        data = careerData.map((c) => ({
          ...c,
          end_date: c.end_date ?? null,
        }));
      } else if (q.includes('education')) {
        data = [...educationData];
      } else if (q.includes('research') || q.includes('thesis')) {
        data = [...researchData];
      } else {
        throw new Error(
          'Table not found. Available tables: about, experience, education, research'
        );
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
  }, []);

  // True DuckDB-WASM query execution
  const runSqlQuery = useCallback(
    async (sqlQuery: string) => {
      const activeConn = connRef.current;
      if (!activeConn) {
        runFallbackQuery(sqlQuery);
        return;
      }

      const t0 = performance.now();
      setErrorText(null);

      try {
        let result: any;
        try {
          result = await activeConn.query(sqlQuery);
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
      } catch (err: any) {
        console.warn('DuckDB query error, falling back to in-memory engine:', err);
        try {
          runFallbackQuery(sqlQuery);
        } catch {
          setErrorText(err.message || String(err));
          setStatusText('Execution failed');
        }
      }
    },
    [runFallbackQuery]
  );

  // Polars Method-Chaining Parser
  const runPolarsQuery = useCallback((polarsExpr: string) => {
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
              start_date: e.start_date,
              end_date: e.end_date,
              title: r ? r.title : '',
              link: r ? r.link : '',
            };
          });
      } else if (expr.includes('group_by')) {
        const map: Record<string, { company: string; roles_held: number; total_months: number }> =
          {};
        for (const exp of careerData) {
          if (!map[exp.company]) {
            map[exp.company] = { company: exp.company, roles_held: 0, total_months: 0 };
          }
          map[exp.company].roles_held += 1;
          map[exp.company].total_months += getInclusiveMonths(exp.start_date, exp.end_date);
        }
        data = Object.values(map)
          .sort((a, b) => b.total_months - a.total_months)
          .map((g) => ({
            company: g.company,
            roles_held: g.roles_held,
            total_months: g.total_months,
            total_years: Math.round((g.total_months / 12.0) * 10) / 10,
          }));
      } else if (
        expr.includes('with_columns') ||
        (expr.includes('dt') && (expr.includes('months') || expr.includes('total_days')))
      ) {
        data = careerData.map((c) => {
          const months = getInclusiveMonths(c.start_date, c.end_date);
          const years = Math.round((months / 12.0) * 10) / 10;
          return {
            company: c.company,
            role: c.role,
            start_date: c.start_date,
            end_date: c.end_date ?? 'Present',
            months,
            years,
          };
        });
      } else if (expr.includes('concat')) {
        data = [
          ...careerData.map((c) => ({
            organization: c.company,
            title: c.role,
            start_date: c.start_date,
            end_date: c.end_date ?? 'Present',
            track: 'Industry',
          })),
          ...educationData.map((e) => ({
            organization: e.institution,
            title: e.qualification,
            start_date: e.start_date,
            end_date: e.end_date,
            track: 'Academic',
          })),
        ].sort((a, b) => (b.start_date > a.start_date ? 1 : -1));
      } else if (expr.startsWith('about')) {
        if (expr.includes('age')) {
          data = aboutData.map((a: any) => ({
            ...a,
            age: getAge(a.date_of_birth),
          }));
        } else {
          data = [...aboutData];
        }
      } else if (expr.startsWith('experience')) {
        data = careerData.map((c) => ({
          ...c,
          end_date: c.end_date ?? 'Present',
        }));
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
        if (selectMatch?.[1] && !selectMatch[1].includes('(')) {
          const selectedCols = selectMatch[1].split(',').map((s) => s.trim().replace(/['"]/g, ''));
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
  }, []);

  const executeQuery = useCallback(
    (query: string, mode: QueryMode) => {
      if (mode === 'sql') {
        runSqlQuery(query);
      } else {
        runPolarsQuery(query);
      }
    },
    [runSqlQuery, runPolarsQuery]
  );

  return {
    duckDbReady,
    statusText,
    errorText,
    setErrorText,
    hasExecuted,
    resultRows,
    columns,
    execTimeMs,
    executeQuery,
  };
}
