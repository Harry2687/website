import type { QueryMode } from './types';

interface ConsoleHeaderProps {
  mode: QueryMode;
  onModeChange: (mode: QueryMode) => void;
  duckDbReady: boolean;
  isMinimized: boolean;
  isFullscreen: boolean;
  onClose: () => void;
  onToggleMinimize: () => void;
  onToggleFullscreen: () => void;
}

export default function ConsoleHeader({
  mode,
  onModeChange,
  duckDbReady,
  isMinimized,
  isFullscreen,
  onClose,
  onToggleMinimize,
  onToggleFullscreen,
}: ConsoleHeaderProps) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between border-b border-[#232836] bg-[#11141d] px-4 py-3 gap-3 ${
        isMinimized ? 'cursor-pointer hover:bg-[#151924] transition-colors' : ''
      }`}
      onClick={(e) => {
        if (isMinimized && (e.target as HTMLElement).tagName !== 'BUTTON') {
          onToggleMinimize();
        }
      }}
    >
      <div className="group/traffic flex items-center space-x-2 py-0.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
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
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleMinimize();
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
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFullscreen();
          }}
          className="w-3 h-3 rounded-full bg-emerald-500/80 hover:bg-emerald-500 border border-emerald-600/50 flex items-center justify-center transition-colors focus:outline-none cursor-pointer"
          title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen Studio'}
          aria-label={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen Studio'}
        >
          <span className="text-[7px] font-bold text-emerald-950 opacity-0 group-hover/traffic:opacity-100 transition-opacity leading-none select-none">
            {isFullscreen ? '⤦' : '⤢'}
          </span>
        </button>
        <span className="text-xs font-mono text-slate-400 ml-2 font-medium">
          harry_zhong.duckdb
        </span>
        {isMinimized && (
          <span className="text-[11px] font-mono text-slate-500 italic ml-1">
            (minimized · click to restore)
          </span>
        )}
      </div>

      {/* Mode Toggle */}
      <div className="flex items-center bg-[#080a0f] p-1 rounded-lg border border-[#232836]">
        <button
          type="button"
          onClick={() => onModeChange('sql')}
          className={`px-3 py-1 rounded text-xs font-mono font-medium transition-all cursor-pointer ${
            mode === 'sql'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          SQL
        </button>
        <button
          type="button"
          onClick={() => onModeChange('polars')}
          className={`px-3 py-1 rounded text-xs font-mono font-medium transition-all cursor-pointer ${
            mode === 'polars'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Polars
        </button>
      </div>

      {/* Engine Status & Fullscreen Hint */}
      <div className="flex items-center space-x-3">
        {isFullscreen && (
          <span className="hidden sm:inline-block text-[11px] font-mono text-slate-500">
            Press{' '}
            <kbd className="px-1 py-0.5 rounded bg-[#161a26] text-slate-300 border border-[#272f44]">
              Esc
            </kbd>{' '}
            to exit
          </span>
        )}
        <div className="flex items-center space-x-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${duckDbReady ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}
          ></span>
          <span className="text-xs font-mono text-slate-400">
            {duckDbReady ? 'DuckDB-WASM Active' : 'In-Memory Engine'}
          </span>
        </div>
      </div>
    </div>
  );
}
