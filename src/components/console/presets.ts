import type { QueryPreset, TableSchema } from './types';

export const SCHEMA_TABLES: TableSchema[] = [
  {
    name: 'about',
    description: 'Profile overview and contact',
    columns: ['name: str', 'location: str', 'contact: str', 'date_of_birth: date'],
  },
  {
    name: 'experience',
    description: 'Employment timeline and domains',
    columns: ['company: str', 'role: str', 'start_date: date', 'end_date: date', 'domain: str'],
  },
  {
    name: 'education',
    description: 'Degrees and qualifications',
    columns: ['institution: str', 'qualification: str', 'start_date: date', 'end_date: date', 'details: str'],
  },
  {
    name: 'research',
    description: 'Academic thesis and papers',
    columns: ['title: str', 'institution: str', 'degree: str', 'year: str', 'domain: str', 'link: str'],
  },
];

export const PRESETS: QueryPreset[] = [
  {
    label: 'About Me',
    sql: `SELECT 
  name, 
  location, 
  contact, 
  DATEDIFF('year', date_of_birth, CURRENT_DATE) AS age
FROM about;`,
    polars: `about.with_columns(
  (pl.lit(date.today()).dt.year() - pl.col("date_of_birth").str.to_date().dt.year()).alias("age")
).select(["name", "location", "contact", "age"])`,
  },
  {
    label: 'Experience',
    sql: 'SELECT role, company, start_date, end_date, domain FROM experience;',
    polars: 'experience.select(["role", "company", "start_date", "end_date", "domain"])',
  },
  {
    label: 'Tenure & Duration',
    sql: `SELECT 
  company,
  COUNT(*) AS roles_held,
  SUM(DATEDIFF('month', start_date, COALESCE(end_date, CURRENT_DATE)) + 1) AS total_months,
  ROUND(SUM(DATEDIFF('month', start_date, COALESCE(end_date, CURRENT_DATE)) + 1) / 12.0, 1) AS total_years
FROM experience
GROUP BY company
ORDER BY total_months DESC;`,
    polars: `experience.with_columns([
  pl.col("start_date").str.to_date(),
  pl.col("end_date").fill_null(pl.lit("2026-11-01")).str.to_date(),
]).with_columns([
  ((pl.col("end_date").dt.year() - pl.col("start_date").dt.year()) * 12 + 
   (pl.col("end_date").dt.month() - pl.col("start_date").dt.month()) + 1).alias("months"),
]).group_by("company").agg([
  pl.len().alias("roles_held"),
  pl.col("months").sum().alias("total_months"),
  (pl.col("months").sum() / 12.0).round(1).alias("total_years"),
]).sort("total_months", descending=True)`,
  },
  {
    label: 'Education × Research (Join)',
    sql: `SELECT 
  e.institution,
  e.qualification,
  e.start_date,
  e.end_date,
  r.title AS thesis_title,
  r.link
FROM education e
INNER JOIN research r 
  ON e.institution = r.institution;`,
    polars: `education.join(research, on="institution").select([
  "institution", "qualification", "start_date", "end_date", "title", "link"
])`,
  },
  {
    label: 'Unified Timeline (Union)',
    sql: `WITH timeline AS (
  SELECT company AS organization, role AS title, start_date, end_date, 'Industry' AS track FROM experience
  UNION ALL
  SELECT institution AS organization, qualification AS title, start_date, end_date, 'Academic' AS track FROM education
)
SELECT 
  organization,
  title,
  track,
  start_date,
  COALESCE(end_date, CURRENT_DATE) AS end_date,
  DATEDIFF('month', start_date, COALESCE(end_date, CURRENT_DATE)) + 1 AS duration_months
FROM timeline
ORDER BY start_date DESC;`,
    polars: `pl.concat([
  experience.select([
    pl.col("company").alias("organization"),
    pl.col("role").alias("title"),
    "start_date",
    "end_date",
    pl.lit("Industry").alias("track"),
  ]),
  education.select([
    pl.col("institution").alias("organization"),
    pl.col("qualification").alias("title"),
    "start_date",
    "end_date",
    pl.lit("Academic").alias("track"),
  ]),
]).sort("start_date", descending=True)`,
  },
];
