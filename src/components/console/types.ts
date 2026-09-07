export interface QueryPreset {
  label: string;
  sql: string;
}

export interface TableSchema {
  name: string;
  description: string;
  columns: string[];
}
