import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import ConsoleHeader from './console/ConsoleHeader';
import { PRESETS } from './console/presets';
import QueryEditor from './console/QueryEditor';
import ResultsTable from './console/ResultsTable';
import SchemaDrawer from './console/SchemaDrawer';
import type { QueryPreset } from './console/types';
import { useQueryEngine } from './console/useQueryEngine';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function CareerConsole() {
  const [query, setQuery] = useState<string>(PRESETS[0].sql);
  const [isSchemaOpen, setIsSchemaOpen] = useState<boolean>(false);
  const [isClosed, setIsClosed] = useState<boolean>(false);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [isReopening, setIsReopening] = useState<boolean>(false);
  const [animateEntrance, setAnimateEntrance] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isBackdropActive, setIsBackdropActive] = useState<boolean>(false);
  const [placeholderHeight, setPlaceholderHeight] = useState<number | null>(null);

  const windowRef = useRef<HTMLDivElement>(null);
  const prevRectRef = useRef<DOMRect | null>(null);

  const {
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
  } = useQueryEngine();

  const hasAutoRunRef = useRef<boolean>(false);

  useEffect(() => {
    if (!hasAutoRunRef.current && engineReady) {
      hasAutoRunRef.current = true;
      executeQuery(query);
    }
  }, [engineReady, executeQuery, query]);

  const isInitializing = !engineReady && !hasExecuted;

  const handleToggleFullscreen = useCallback(() => {
    if (isMinimized) setIsMinimized(false);
    if (!windowRef.current) {
      setIsFullscreen((prev) => !prev);
      return;
    }

    const el = windowRef.current;
    const firstRect = el.getBoundingClientRect();
    prevRectRef.current = firstRect;

    if (!isFullscreen) {
      setPlaceholderHeight(firstRect.height);
      setIsBackdropActive(true);
      setIsFullscreen(true);
    } else {
      setIsFullscreen(false);
      setTimeout(() => {
        setIsBackdropActive(false);
      }, 320);
    }
  }, [isMinimized, isFullscreen]);

  // FLIP transition for maximizing and unmaximizing
  useIsomorphicLayoutEffect(() => {
    const el = windowRef.current;
    const firstRect = prevRectRef.current;
    if (!el || !firstRect) return;

    prevRectRef.current = null;

    const lastRect = el.getBoundingClientRect();
    const deltaX = firstRect.left - lastRect.left;
    const deltaY = firstRect.top - lastRect.top;
    const scaleX = firstRect.width / Math.max(lastRect.width, 1);
    const scaleY = firstRect.height / Math.max(lastRect.height, 1);

    if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1 && Math.abs(scaleX - 1) < 0.01) {
      return;
    }

    // Invert immediately before paint
    el.style.transformOrigin = 'top left';
    el.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`;
    el.style.transition = 'none';

    // Force layout reflow
    void el.offsetHeight;

    // Play animation
    requestAnimationFrame(() => {
      el.style.transition =
        'transform 320ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 320ms ease-out';
      el.style.transform = 'translate(0px, 0px) scale(1, 1)';

      const cleanup = () => {
        el.style.transform = '';
        el.style.transformOrigin = '';
        el.style.transition = '';
        setPlaceholderHeight(null);
      };

      const timer = setTimeout(cleanup, 340);
      el.addEventListener(
        'transitionend',
        () => {
          clearTimeout(timer);
          cleanup();
        },
        { once: true }
      );
    });
  }, [isFullscreen]);

  // Fullscreen escape key listener & scroll lock
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isFullscreen) {
        handleToggleFullscreen();
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
  }, [isFullscreen, handleToggleFullscreen]);

  function handleExecute() {
    executeQuery(query);
  }

  function handleSelectPreset(preset: QueryPreset) {
    setQuery(preset.sql);
  }

  function handleTableClick(tableName: string) {
    setQuery(`SELECT * FROM ${tableName};`);
  }

  function handleReset() {
    setQuery(PRESETS[0].sql);
  }

  function handleClose() {
    setIsClosing(true);
    if (isFullscreen) {
      setIsBackdropActive(false);
    }
    setTimeout(() => {
      setIsClosed(true);
      setIsClosing(false);
      setIsMinimized(false);
      setIsFullscreen(false);
      setPlaceholderHeight(null);
    }, 200);
  }

  function handleReopen() {
    setIsReopening(true);
    setTimeout(() => {
      setIsClosed(false);
      setIsReopening(false);
      setAnimateEntrance(true);
      setTimeout(() => setAnimateEntrance(false), 320);
    }, 150);
  }

  if (isClosed) {
    return (
      <div
        key="closed-container"
        className="w-full min-h-[440px] flex flex-col items-center justify-center py-12 px-4"
      >
        <div
          className={`w-full max-w-md rounded-2xl border border-vsc-border bg-vsc-card p-6 shadow-2xl text-center space-y-4 ${
            isReopening
              ? 'opacity-0 scale-95 transition-all duration-150 ease-out'
              : 'animate-fadeIn'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></div>
            <span className="text-xs font-mono text-vsc-fg font-medium">
              Terminal session closed
            </span>
          </div>
          <p className="text-xs text-vsc-fg-muted font-mono leading-relaxed">
            Process exited with code 0. Reconnect to launch DuckDB-WASM and restore interactive
            session.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleReopen}
              className="px-4 py-2 rounded-lg bg-vsc-blue hover:bg-vsc-blue-hover active:scale-95 text-white font-mono text-xs font-semibold shadow-md shadow-vsc-blue/20 transition-all inline-flex items-center space-x-2 cursor-pointer"
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
      {isBackdropActive && (
        <div
          className={`fixed inset-0 bg-vsc-bg/75 backdrop-blur-md z-40 transition-opacity duration-300 ease-out ${
            isFullscreen ? 'opacity-100 animate-fadeIn' : 'opacity-0'
          }`}
          onClick={handleToggleFullscreen}
        />
      )}

      {isFullscreen && placeholderHeight !== null && (
        <div style={{ height: placeholderHeight }} className="w-full pointer-events-none" />
      )}

      <div
        key="open-window"
        ref={windowRef}
        className={`${
          isFullscreen
            ? 'fixed inset-3 md:inset-6 z-50 rounded-2xl border border-vsc-border bg-vsc-window shadow-2xl overflow-hidden flex flex-col'
            : 'w-full rounded-2xl border border-vsc-border bg-vsc-window shadow-2xl overflow-hidden'
        } ${isClosing ? 'scale-95 opacity-0 transition-all duration-200 ease-out' : ''} ${
          animateEntrance ? 'animate-windowOpen' : ''
        }`}
      >
        <ConsoleHeader
          duckDbReady={duckDbReady}
          isMinimized={isMinimized}
          isFullscreen={isFullscreen}
          onClose={handleClose}
          onToggleMinimize={() => {
            setIsMinimized(!isMinimized);
            if (isFullscreen) handleToggleFullscreen();
          }}
          onToggleFullscreen={handleToggleFullscreen}
        />

        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isMinimized
              ? 'grid-rows-[0fr] opacity-0 pointer-events-none'
              : 'grid-rows-[1fr] opacity-100'
          } ${isFullscreen ? 'flex-1 min-h-0' : ''}`}
        >
          <div className={`overflow-hidden h-full ${isFullscreen ? 'flex flex-col min-h-0' : ''}`}>
            <div
              className={`flex flex-col md:flex-row items-stretch ${isFullscreen ? 'flex-1 h-full min-h-0' : 'min-h-[440px] h-full'}`}
            >
              <SchemaDrawer
                isOpen={isSchemaOpen}
                onToggle={() => setIsSchemaOpen(!isSchemaOpen)}
                onTableClick={handleTableClick}
                tables={tableSchemas}
              />

              <div className="flex-1 flex flex-col min-w-0 bg-vsc-editor">
                <QueryEditor
                  query={query}
                  onQueryChange={setQuery}
                  onExecute={handleExecute}
                  onSelectPreset={handleSelectPreset}
                  onReset={handleReset}
                  isExecuting={isExecuting || isInitializing}
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
                  isExecuting={isExecuting}
                  isInitializing={isInitializing}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
