import { SCHEMA_TABLES } from './presets';
import type { TableSchema } from './types';

interface SchemaDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  onTableClick: (tableName: string) => void;
  tables?: TableSchema[];
}

export default function SchemaDrawer({
  isOpen,
  onToggle,
  onTableClick,
  tables = SCHEMA_TABLES,
}: SchemaDrawerProps) {
  return (
    <>
      {/* Mobile Schema Accordion Header */}
      <div className="md:hidden border-b border-vsc-border bg-vsc-sidebar">
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between px-4 py-2 text-xs font-mono text-vsc-fg-muted hover:text-vsc-fg-bright transition-colors cursor-pointer"
        >
          <span className="flex items-center space-x-2">
            <span
              className={`text-[10px] text-vsc-blue transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
            >
              ▶
            </span>
            <span className="font-medium uppercase tracking-wider text-[11px] text-vsc-fg">
              Schema Catalog
            </span>
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-vsc-chip-bg text-vsc-chip-text border border-vsc-chip-border">
            {tables.length} tables
          </span>
        </button>
        <div
          className={`overflow-hidden transition-all duration-200 ease-in-out ${
            isOpen ? 'max-h-96 p-3 border-t border-vsc-border' : 'max-h-0'
          }`}
        >
          {tables.length === 0 ? (
            <div className="py-4 text-center text-vsc-fg-muted text-xs font-mono">
              No tables found in catalog
            </div>
          ) : (
            <div className="space-y-3">
              {tables.map((tbl) => (
                <div key={tbl.name}>
                  <button
                    type="button"
                    onClick={() => onTableClick(tbl.name)}
                    className="text-left font-mono text-xs font-medium text-vsc-blue hover:underline mb-1 cursor-pointer"
                  >
                    ▶ {tbl.name}
                  </button>
                  <div className="pl-3 flex flex-wrap gap-1">
                    {tbl.columns.map((col) => (
                      <span
                        key={col}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-vsc-chip-bg border border-vsc-chip-border text-vsc-fg-muted"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Schema Catalog Sidebar (Smooth Symmetrical Collapse/Expand) */}
      <aside
        className={`hidden md:flex flex-col justify-between shrink-0 border-r border-vsc-border bg-vsc-sidebar transition-[width] duration-200 ease-in-out overflow-hidden relative self-stretch ${
          isOpen ? 'w-60' : 'w-10'
        }`}
      >
        {/* Collapsed Rail View */}
        <div
          className={`absolute inset-0 flex flex-col items-center py-3 select-none transition-opacity duration-150 ${
            isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <button
            type="button"
            onClick={onToggle}
            className="p-1.5 rounded hover:bg-vsc-hover text-vsc-fg-muted hover:text-vsc-blue transition-colors cursor-pointer"
            title="Expand Schema Catalog"
          >
            <svg
              aria-hidden="true"
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onToggle}
            className="mt-6 text-vsc-fg-subtle hover:text-vsc-fg font-mono text-[10px] uppercase tracking-widest [writing-mode:vertical-rl] rotate-180 py-2 transition-colors cursor-pointer"
            title="Expand Schema Catalog"
          >
            Schema ({tables.length})
          </button>
        </div>

        {/* Expanded Catalog View */}
        <div
          className={`w-60 p-3 flex-1 flex flex-col justify-between transition-opacity duration-200 ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div>
            <div className="flex items-center justify-between px-2 py-1 mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-vsc-fg-muted font-semibold">
                Schema Catalog
              </span>
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-vsc-chip-bg text-vsc-chip-text border border-vsc-chip-border">
                  {tables.length} tables
                </span>
                <button
                  type="button"
                  onClick={onToggle}
                  className="p-1 rounded hover:bg-vsc-hover text-vsc-fg-muted hover:text-vsc-fg-bright transition-colors cursor-pointer"
                  title="Collapse Schema Catalog"
                >
                  <svg
                    aria-hidden="true"
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {tables.length === 0 ? (
              <div className="py-8 px-2 text-center text-vsc-fg-muted space-y-1">
                <p className="text-xs font-mono font-medium text-vsc-fg">No tables found</p>
                <p className="text-[10px] text-vsc-fg-subtle leading-relaxed">
                  Run a CREATE TABLE query to add tables
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tables.map((tbl) => (
                  <div key={tbl.name} className="group">
                    <button
                      type="button"
                      onClick={() => onTableClick(tbl.name)}
                      className="w-full text-left flex items-center justify-between px-2 py-1 rounded hover:bg-vsc-hover text-vsc-blue font-mono text-xs font-medium transition-colors cursor-pointer"
                      title={`Click to query ${tbl.name}`}
                    >
                      <span className="flex items-center space-x-1.5">
                        <span className="text-vsc-fg-subtle text-[10px]">▶</span>
                        <span>{tbl.name}</span>
                      </span>
                      <span className="text-[10px] text-vsc-fg-subtle opacity-0 group-hover:opacity-100 transition-opacity">
                        select
                      </span>
                    </button>

                    <div className="pl-4 pr-1 py-1 space-y-0.5">
                      {tbl.columns.map((col) => (
                        <div
                          key={col}
                          className="text-[11px] font-mono text-vsc-fg-muted hover:text-vsc-fg-bright transition-colors truncate"
                        >
                          {col}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-vsc-border px-2 text-[10px] font-mono text-vsc-fg-subtle">
            Click table to load query
          </div>
        </div>
      </aside>
    </>
  );
}
