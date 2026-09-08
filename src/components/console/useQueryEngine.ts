import { useCallback, useEffect, useRef, useState } from 'react';
import aboutData from '../../data/about.json';
import careerData from '../../data/career.json';
import educationData from '../../data/education.json';
import researchData from '../../data/research.json';
import { getAge, getInclusiveMonths } from './dateUtils';

export function useQueryEngine() {
  const [hasExecuted, setHasExecuted] = useState<boolean>(false);
  const [resultRows, setResultRows] = useState<Record<string, any>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [execTimeMs, setExecTimeMs] = useState<number | null>(null);
  const [statusText, setStatusText] = useState<string>('Initializing DuckDB-WASM...');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [duckDbReady, setDuckDbReady] = useState<boolean>(false);
  const [engineReady, setEngineReady] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  const duckDbRef = useRef<any>(null);
  const connRef = useRef<any>(null);
  const isExecutingRef = useRef<boolean>(false);

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
    const delayMs = Math.floor(320 + Math.random() * 160);
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    try {
      const q = sqlQuery.toLowerCase().trim();
      let data: Record<string, any>[] = [];

      if (q.includes('union') || q.includes('timeline')) {
        const dob = aboutData[0]?.date_of_birth || '2001-06-25';
        data = [
          ...careerData.map((c) => ({
            organization: c.company,
            title: c.role,
            location: c.location,
            track: 'Industry',
            start_date: c.start_date,
            age_at_start: getAge(dob, c.start_date),
            duration_months: getInclusiveMonths(c.start_date, c.end_date),
          })),
          ...educationData.map((e) => ({
            organization: e.institution,
            title: e.qualification,
            location: e.location,
            track: 'Academic',
            start_date: e.start_date,
            age_at_start: getAge(dob, e.start_date),
            duration_months: getInclusiveMonths(e.start_date, e.end_date),
          })),
        ].sort((a, b) => (b.start_date > a.start_date ? 1 : -1));
      } else if (q.includes('join')) {
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
      } else if (q.includes('about')) {
        const parts = q.split(/\bfrom\b/i);
        const selectClause = parts[0]?.replace(/^select\s+/i, '').replace(/\([^)]*\)/g, '') || '';
        const wantsDob = q.includes('*') || /\bdate_of_birth\b/i.test(selectClause);
        const wantsPhoto = q.includes('*') || /\bphoto\b/i.test(selectClause);
        const latestRole = [...careerData].sort((a, b) =>
          b.start_date > a.start_date ? 1 : -1
        )[0];
        const derivedLocation = latestRole?.location || 'Sydney, NSW';
        if (q.includes('age')) {
          data = aboutData.map((a: any) => {
            const row: Record<string, any> = {
              name: a.name,
              location: derivedLocation,
              contact: a.contact,
            };
            if (wantsDob) row.date_of_birth = a.date_of_birth;
            row.age = getAge(a.date_of_birth);
            if (wantsPhoto) row.photo = a.photo || '/profile.jpg';
            return row;
          });
        } else {
          data = aboutData.map((a: any) => ({
            name: a.name,
            location: derivedLocation,
            contact: a.contact,
            ...(wantsDob ? { date_of_birth: a.date_of_birth } : {}),
            ...(wantsPhoto ? { photo: a.photo || '/profile.jpg' } : {}),
          }));
        }
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
            location: c.location,
            start_date: c.start_date,
            end_date: c.end_date ?? new Date().toISOString().split('T')[0],
            months,
            years,
          };
        });
      } else if (q.includes('experience') || q.includes('career')) {
        data = careerData.map((c) => ({
          role: c.role,
          company: c.company,
          location: c.location,
          start_date: c.start_date,
          end_date: c.end_date ?? null,
          domain: c.domain,
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
      setStatusText(`Query executed in ${Math.round((t1 - t0) * 10) / 10}ms`);
    } catch (err: any) {
      setErrorText(err.message || String(err));
      setStatusText('Query error');
    } finally {
      setIsExecuting(false);
      isExecutingRef.current = false;
    }
  }, []);

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
      const delayMs = Math.floor(320 + Math.random() * 160);

      try {
        let result: any;
        try {
          const [res] = await Promise.all([
            activeConn.query(sqlQuery),
            new Promise((resolve) => setTimeout(resolve, delayMs)),
          ]);
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
      } catch (err: any) {
        console.warn('DuckDB query error, falling back to in-memory engine:', err);
        try {
          await runFallbackQuery(sqlQuery);
        } catch {
          setErrorText(err.message || String(err));
          setStatusText('Execution failed');
        }
      } finally {
        setIsExecuting(false);
        isExecutingRef.current = false;
      }
    },
    [runFallbackQuery]
  );

  const executeQuery = useCallback(
    async (query: string) => {
      if (isExecutingRef.current) return;
      await runSqlQuery(query);
    },
    [runSqlQuery]
  );

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
    executeQuery,
  };
}
