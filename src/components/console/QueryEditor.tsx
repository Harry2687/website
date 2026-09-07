import { Loader2 } from 'lucide-react';
import { PRESETS } from './presets';
import type { QueryPreset } from './types';
import { useModifierKey } from './useModifierKey';

interface QueryEditorProps {
  query: string;
  onQueryChange: (query: string) => void;
  onExecute: () => void;
  onSelectPreset: (preset: QueryPreset) => void;
  onReset: () => void;
  isExecuting?: boolean;
}

export default function QueryEditor({
  query,
  onQueryChange,
  onExecute,
  onSelectPreset,
  onReset,
  isExecuting = false,
}: QueryEditorProps) {
  const modifierKey = useModifierKey();
  return (
    <>
      {/* Preset Chips */}
      <div className="px-4 py-2.5 bg-vsc-bar border-b border-vsc-border flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-vsc-fg-subtle font-mono text-[11px] uppercase tracking-wider whitespace-nowrap">
          Presets:
        </span>
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onSelectPreset(preset)}
            className="px-2.5 py-1 rounded-md bg-vsc-chip-bg hover:bg-vsc-chip-hover text-vsc-chip-text border border-vsc-chip-border whitespace-nowrap transition-colors font-mono text-[11px] cursor-pointer"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Query Code Editor Area */}
      <div className="relative border-b border-vsc-border bg-vsc-editor">
        <div className="flex">
          <div className="select-none font-mono text-xs text-vsc-fg-subtle px-3.5 py-3 text-right bg-vsc-gutter border-r border-vsc-border shrink-0">
            &gt;
          </div>
          <textarea
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                if (!isExecuting) {
                  onExecute();
                }
              }
            }}
            rows={Math.min(Math.max(query.split('\n').length, 2), 8)}
            className="w-full font-mono text-xs text-vsc-code bg-transparent px-3 py-3 focus:outline-none resize-none leading-relaxed placeholder:text-vsc-fg-subtle"
            placeholder={PRESETS[0].sql}
          />
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-vsc-bar border-t border-vsc-border">
          <div className="text-[11px] font-mono text-vsc-fg-subtle">
            Press{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-vsc-kbd-bg text-vsc-kbd-text border border-vsc-kbd-border">
              {modifierKey} + Enter
            </kbd>{' '}
            to execute
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onReset}
              disabled={isExecuting}
              className="px-3 py-1 rounded text-xs font-mono text-vsc-fg-muted hover:text-vsc-fg-bright hover:bg-vsc-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onExecute}
              disabled={isExecuting}
              className={`px-4 py-1.5 rounded-md font-mono text-xs font-semibold shadow-md transition-all flex items-center space-x-1.5 ${
                isExecuting
                  ? 'bg-vsc-blue/50 text-white/70 cursor-not-allowed shadow-none'
                  : 'bg-vsc-blue hover:bg-vsc-blue-hover text-white shadow-vsc-blue/20 cursor-pointer'
              }`}
            >
              {isExecuting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Running...</span>
                </>
              ) : (
                <span>Run Query</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
