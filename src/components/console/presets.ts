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
    columns: [
      'institution: str',
      'qualification: str',
      'start_date: date',
      'end_date: date',
      'details: str',
    ],
  },
  {
    name: 'research',
    description: 'Academic thesis and papers',
    columns: [
      'title: str',
      'institution: str',
      'degree: str',
      'year: str',
      'domain: str',
      'link: str',
    ],
  },
];

export const PRESETS: QueryPreset[] = [
  {
    label: 'About Me',
    sql: `SELECT 
  name, 
  location, 
  contact, 
  DATEDIFF('year', date_of_birth, CURRENT_DATE) - 
    CASE WHEN strftime(CURRENT_DATE, '%m%d') < strftime(date_of_birth, '%m%d') THEN 1 ELSE 0 END AS age
FROM about;`,
    polars: `about.with_columns(
  (
    pl.lit(date.today()).dt.year() - pl.col("date_of_birth").str.to_date().dt.year()
    - (pl.lit(date.today()).dt.strftime("%m%d") < pl.col("date_of_birth").str.to_date().dt.strftime("%m%d")).cast(pl.Int32)
  ).alias("age")
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
  pl.col("end_date").fill_null(pl.lit(date.today())).str.to_date(),
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
  "institution",
  "qualification",
  "start_date",
  "end_date",
  pl.col("title").alias("thesis_title"),
  "link",
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
  DATEDIFF('year', date_of_birth, start_date) - 
    CASE WHEN strftime(start_date, '%m%d') < strftime(date_of_birth, '%m%d') THEN 1 ELSE 0 END AS age_at_start,
  DATEDIFF('month', start_date, COALESCE(end_date, CURRENT_DATE)) + 1 AS duration_months
FROM timeline
CROSS JOIN about
ORDER BY start_date DESC;`,
    polars: `pl.concat([
  experience.select([
    pl.col("company").alias("organization"),
    pl.col("role").alias("title"),
    pl.lit("Industry").alias("track"),
    "start_date",
    "end_date",
  ]),
  education.select([
    pl.col("institution").alias("organization"),
    pl.col("qualification").alias("title"),
    pl.lit("Academic").alias("track"),
    "start_date",
    "end_date",
  ]),
]).join(
  about.select(["date_of_birth"]), how="cross"
).with_columns([
  (
    pl.col("start_date").str.to_date().dt.year() - pl.col("date_of_birth").str.to_date().dt.year()
    - (pl.col("start_date").str.to_date().dt.strftime("%m%d") < pl.col("date_of_birth").str.to_date().dt.strftime("%m%d")).cast(pl.Int32)
  ).alias("age_at_start"),
  ((pl.col("end_date").fill_null(pl.lit(date.today())).str.to_date().dt.year() - pl.col("start_date").str.to_date().dt.year()) * 12 +
   (pl.col("end_date").fill_null(pl.lit(date.today())).str.to_date().dt.month() - pl.col("start_date").str.to_date().dt.month()) + 1).alias("duration_months"),
]).select([
  "organization", "title", "track", "start_date", "age_at_start", "duration_months"
]).sort("start_date", descending=True)`,
  },
];
