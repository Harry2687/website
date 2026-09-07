export type QueryMode = 'sql' | 'polars';

export interface QueryPreset {
  label: string;
  sql: string;
  polars: string;
}

export interface TableSchema {
  name: string;
  description: string;
  columns: string[];
}
