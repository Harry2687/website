import { useEffect, useState } from 'react';
import ConsoleHeader from './console/ConsoleHeader';
import { PRESETS } from './console/presets';
import QueryEditor from './console/QueryEditor';
import ResultsTable from './console/ResultsTable';
import SchemaDrawer from './console/SchemaDrawer';
import type { QueryMode, QueryPreset } from './console/types';
import { useQueryEngine } from './console/useQueryEngine';

export default function CareerConsole() {
  const [mode, setMode] = useState<QueryMode>('sql');
  const [query, setQuery] = useState<string>(PRESETS[0].sql);
  const [isSchemaOpen, setIsSchemaOpen] = useState<boolean>(false);
  const [isClosed, setIsClosed] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const {
    duckDbReady,
    statusText,
    errorText,
    setErrorText,
    hasExecuted,
    resultRows,
    columns,
    execTimeMs,
    executeQuery,
  } = useQueryEngine();

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

  function handleExecute() {
    executeQuery(query, mode);
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
    const matchingPreset = PRESETS.find((p) => p.sql === query || p.polars === query) || PRESETS[0];
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
            <span className="text-xs font-mono text-slate-400 font-medium">
              Terminal session closed
            </span>
          </div>
          <p className="text-xs text-slate-500 font-mono leading-relaxed">
            Process exited with code 0. Reconnect to launch DuckDB-WASM and restore interactive
            session.
          </p>
          <div className="pt-2">
            <button
              type="button"
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
        <ConsoleHeader
          mode={mode}
          onModeChange={handleModeChange}
          duckDbReady={duckDbReady}
          isMinimized={isMinimized}
          isFullscreen={isFullscreen}
          onClose={() => {
            setIsClosed(true);
            setIsMinimized(false);
            setIsFullscreen(false);
          }}
          onToggleMinimize={() => {
            setIsMinimized(!isMinimized);
            if (isFullscreen) setIsFullscreen(false);
          }}
          onToggleFullscreen={() => {
            setIsFullscreen(!isFullscreen);
            if (isMinimized) setIsMinimized(false);
          }}
        />

        {!isMinimized && (
          <div
            className={`flex flex-col md:flex-row ${isFullscreen ? 'flex-1 min-h-0' : 'min-h-[440px]'}`}
          >
            <SchemaDrawer
              isOpen={isSchemaOpen}
              onToggle={() => setIsSchemaOpen(!isSchemaOpen)}
              onTableClick={handleTableClick}
            />

            <div className="flex-1 flex flex-col min-w-0 bg-[#0c0e14]">
              <QueryEditor
                mode={mode}
                query={query}
                onQueryChange={setQuery}
                onExecute={handleExecute}
                onSelectPreset={handleSelectPreset}
                onReset={handleReset}
              />

              <ResultsTable
                hasExecuted={hasExecuted}
                resultRows={resultRows}
                columns={columns}
                execTimeMs={execTimeMs}
                statusText={statusText}
                errorText={errorText}
                onErrorDismiss={() => setErrorText(null)}
                isFullscreen={isFullscreen}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
