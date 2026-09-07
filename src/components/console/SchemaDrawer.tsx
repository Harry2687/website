import React from 'react';
import { SCHEMA_TABLES } from './presets';

interface SchemaDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  onTableClick: (tableName: string) => void;
}

export default function SchemaDrawer({ isOpen, onToggle, onTableClick }: SchemaDrawerProps) {
  return (
    <>
      {/* Mobile Schema Accordion Header */}
      <div className="md:hidden border-b border-[#232836] bg-[#0b0d13]">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between px-4 py-2 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <span className="flex items-center space-x-2">
            <span className={`text-[10px] text-sky-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
              ▶
            </span>
            <span className="font-medium uppercase tracking-wider text-[11px] text-slate-300">Schema Catalog</span>
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#161a26] text-slate-400 border border-[#272f44]">
            {SCHEMA_TABLES.length} tables
          </span>
        </button>
        <div
          className={`overflow-hidden transition-all duration-200 ease-in-out ${
            isOpen ? 'max-h-96 p-3 border-t border-[#1c2233]' : 'max-h-0'
          }`}
        >
          <div className="space-y-3">
            {SCHEMA_TABLES.map((tbl) => (
              <div key={tbl.name}>
                <button
                  onClick={() => onTableClick(tbl.name)}
                  className="text-left font-mono text-xs font-medium text-sky-400 hover:text-sky-300 mb-1 cursor-pointer"
                >
                  ▶ {tbl.name}
                </button>
                <div className="pl-3 flex flex-wrap gap-1">
                  {tbl.columns.map((col) => (
                    <span
                      key={col}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#161a26] border border-[#272f44] text-slate-400"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Schema Catalog Sidebar (Smooth Symmetrical Collapse/Expand) */}
      <aside
        className={`hidden md:flex flex-col justify-between shrink-0 border-r border-[#232836] bg-[#0b0d13] transition-[width] duration-200 ease-in-out overflow-hidden relative ${
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
            onClick={onToggle}
            className="p-1.5 rounded hover:bg-[#161a26] text-slate-400 hover:text-sky-400 transition-colors cursor-pointer"
            title="Expand Schema Catalog"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={onToggle}
            className="mt-6 text-slate-500 hover:text-slate-300 font-mono text-[10px] uppercase tracking-widest [writing-mode:vertical-rl] rotate-180 py-2 transition-colors cursor-pointer"
            title="Expand Schema Catalog"
          >
            Schema ({SCHEMA_TABLES.length})
          </button>
        </div>

        {/* Expanded Catalog View */}
        <div
          className={`w-60 p-3 h-full flex flex-col justify-between transition-opacity duration-200 ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div>
            <div className="flex items-center justify-between px-2 py-1 mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                Schema Catalog
              </span>
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#161a26] text-slate-400 border border-[#272f44]">
                  {SCHEMA_TABLES.length} tables
                </span>
                <button
                  onClick={onToggle}
                  className="p-1 rounded hover:bg-[#161a26] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  title="Collapse Schema Catalog"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {SCHEMA_TABLES.map((tbl) => (
                <div key={tbl.name} className="group">
                  <button
                    onClick={() => onTableClick(tbl.name)}
                    className="w-full text-left flex items-center justify-between px-2 py-1 rounded hover:bg-[#151926] text-sky-400 hover:text-sky-300 font-mono text-xs font-medium transition-colors cursor-pointer"
                    title={`Click to query ${tbl.name}`}
                  >
                    <span className="flex items-center space-x-1.5">
                      <span className="text-slate-500 text-[10px]">▶</span>
                      <span>{tbl.name}</span>
                    </span>
                    <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      select
                    </span>
                  </button>

                  <div className="pl-4 pr-1 py-1 space-y-0.5">
                    {tbl.columns.map((col) => (
                      <div
                        key={col}
                        className="text-[11px] font-mono text-slate-400 hover:text-slate-200 transition-colors truncate"
                      >
                        {col}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#1c2233] px-2 text-[10px] font-mono text-slate-500">
            Click table to load query
          </div>
        </div>
      </aside>
    </>
  );
}
