import { PRESETS } from './presets';
import type { QueryMode, QueryPreset } from './types';

interface QueryEditorProps {
  mode: QueryMode;
  query: string;
  onQueryChange: (query: string) => void;
  onExecute: () => void;
  onSelectPreset: (preset: QueryPreset) => void;
  onReset: () => void;
}

export default function QueryEditor({
  mode,
  query,
  onQueryChange,
  onExecute,
  onSelectPreset,
  onReset,
}: QueryEditorProps) {
  return (
    <>
      {/* Preset Chips */}
      <div className="px-4 py-2.5 bg-[#0e111a] border-b border-[#232836]/60 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-slate-500 font-mono text-[11px] uppercase tracking-wider whitespace-nowrap">
          Presets:
        </span>
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onSelectPreset(preset)}
            className="px-2.5 py-1 rounded-md bg-[#161a26] hover:bg-[#1f2436] text-slate-300 hover:text-white border border-[#272f44] whitespace-nowrap transition-colors font-mono text-[11px] cursor-pointer"
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
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                onExecute();
              }
            }}
            rows={Math.min(Math.max(query.split('\n').length, 2), 8)}
            className="w-full font-mono text-xs text-emerald-300 bg-transparent px-3 py-3 focus:outline-none resize-none leading-relaxed"
            placeholder={mode === 'sql' ? PRESETS[0].sql : PRESETS[0].polars}
          />
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#0d1017] border-t border-[#232836]/40">
          <div className="text-[11px] font-mono text-slate-500">
            Press{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-[#1c2233] text-slate-300 border border-[#2e3752]">
              ⌘ + Enter
            </kbd>{' '}
            to execute
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onReset}
              className="px-3 py-1 rounded text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-[#1a2030] transition-colors cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onExecute}
              className="px-4 py-1.5 rounded-md bg-sky-500 hover:bg-sky-400 text-slate-950 font-mono text-xs font-semibold shadow-md shadow-sky-500/10 transition-all cursor-pointer"
            >
              Run Query
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
