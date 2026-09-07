interface ConsoleHeaderProps {
  duckDbReady: boolean;
  isMinimized: boolean;
  isFullscreen: boolean;
  onClose: () => void;
  onToggleMinimize: () => void;
  onToggleFullscreen: () => void;
}

export default function ConsoleHeader({
  duckDbReady,
  isMinimized,
  isFullscreen,
  onClose,
  onToggleMinimize,
  onToggleFullscreen,
}: ConsoleHeaderProps) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between border-b border-vsc-border bg-vsc-header px-4 py-3 gap-3 ${
        isMinimized ? 'cursor-pointer hover:bg-vsc-hover transition-colors' : ''
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
          className="relative w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] flex items-center justify-center transition-all duration-150 ease-out hover:scale-110 active:scale-95 hover:brightness-105 active:brightness-90 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 cursor-pointer"
          title="Close window"
          aria-label="Close window"
        >
          <svg
            viewBox="0 0 8 8"
            className="w-1.5 h-1.5 text-[#4c0000] opacity-0 group-hover/traffic:opacity-100 transition-opacity duration-150 ease-out pointer-events-none"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          >
            <path d="M1.75 1.75L6.25 6.25M6.25 1.75L1.75 6.25" />
          </svg>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleMinimize();
          }}
          className="relative w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] flex items-center justify-center transition-all duration-150 ease-out hover:scale-110 active:scale-95 hover:brightness-105 active:brightness-90 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/50 cursor-pointer"
          title={isMinimized ? 'Restore window' : 'Minimize window'}
          aria-label={isMinimized ? 'Restore window' : 'Minimize window'}
        >
          <svg
            viewBox="0 0 8 8"
            className="w-1.5 h-1.5 text-[#5c3d00] opacity-0 group-hover/traffic:opacity-100 transition-opacity duration-150 ease-out pointer-events-none"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          >
            <path d="M1.5 4H6.5" />
          </svg>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFullscreen();
          }}
          className="relative w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] flex items-center justify-center transition-all duration-150 ease-out hover:scale-110 active:scale-95 hover:brightness-105 active:brightness-90 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 cursor-pointer"
          title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen Studio'}
          aria-label={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen Studio'}
        >
          <svg
            viewBox="0 0 8 8"
            className="w-1.5 h-1.5 text-[#004d11] opacity-0 group-hover/traffic:opacity-100 transition-opacity duration-150 ease-out pointer-events-none"
            fill="currentColor"
          >
            {isFullscreen ? (
              <>
                <path d="M1.5 3.5L3.5 1.5L3.5 3.5L1.5 3.5Z" />
                <path d="M6.5 4.5L4.5 6.5L4.5 4.5L6.5 4.5Z" />
              </>
            ) : (
              <>
                <path d="M1.5 1.5L4.5 1.5L1.5 4.5L1.5 1.5Z" />
                <path d="M6.5 6.5L3.5 6.5L6.5 3.5L6.5 6.5Z" />
              </>
            )}
          </svg>
        </button>
        <span className="text-xs font-mono text-vsc-fg-muted ml-2 font-medium">
          harry_zhong.duckdb
        </span>
        {isMinimized && (
          <span className="text-[11px] font-mono text-vsc-fg-subtle italic ml-1 animate-pulse">
            (minimized · click to restore)
          </span>
        )}
      </div>

      {/* Engine Status & Fullscreen Hint */}
      <div className="flex items-center space-x-3">
        {isFullscreen && (
          <span className="hidden sm:inline-block text-[11px] font-mono text-vsc-fg-subtle">
            Press{' '}
            <kbd className="px-1 py-0.5 rounded bg-vsc-kbd-bg text-vsc-kbd-text border border-vsc-kbd-border">
              Esc
            </kbd>{' '}
            to exit
          </span>
        )}
        <div className="flex items-center space-x-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${duckDbReady ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}
          ></span>
          <span className="text-xs font-mono text-vsc-fg-muted">
            {duckDbReady ? 'DuckDB-WASM Active' : 'In-Memory Engine'}
          </span>
        </div>
      </div>
    </div>
  );
}
