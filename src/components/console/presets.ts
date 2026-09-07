import type { QueryPreset, TableSchema } from './types';

export const SCHEMA_TABLES: TableSchema[] = [
  {
    name: 'about',
    description: 'Profile overview and contact',
    columns: ['name: str', 'contact: str', 'date_of_birth: date', 'photo: str'],
  },
  {
    name: 'experience',
    description: 'Employment timeline and domains',
    columns: [
      'company: str',
      'role: str',
      'location: str',
      'start_date: date',
      'end_date: date',
      'domain: str',
    ],
  },
  {
    name: 'education',
    description: 'Degrees and qualifications',
    columns: [
      'institution: str',
      'qualification: str',
      'location: str',
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
  (SELECT location FROM experience ORDER BY start_date DESC LIMIT 1) AS location,
  contact, 
  DATEDIFF('year', date_of_birth, CURRENT_DATE) - 
    CASE WHEN strftime(CURRENT_DATE, '%m%d') < strftime(date_of_birth, '%m%d') THEN 1 ELSE 0 END AS age,
  photo
FROM about;`,
  },
  {
    label: 'Experience',
    sql: 'SELECT role, company, location, start_date, end_date, domain FROM experience;',
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
  },
  {
    label: 'Education & Research',
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
  },
  {
    label: 'Unified Timeline',
    sql: `WITH timeline AS (
  SELECT company AS organization, role AS title, location, start_date, end_date, 'Industry' AS track FROM experience
  UNION ALL
  SELECT institution AS organization, qualification AS title, location, start_date, end_date, 'Academic' AS track FROM education
)
SELECT 
  organization,
  title,
  location,
  track,
  start_date,
  DATEDIFF('year', date_of_birth, start_date) - 
    CASE WHEN strftime(start_date, '%m%d') < strftime(date_of_birth, '%m%d') THEN 1 ELSE 0 END AS age_at_start,
  DATEDIFF('month', start_date, COALESCE(end_date, CURRENT_DATE)) + 1 AS duration_months
FROM timeline
CROSS JOIN about
ORDER BY start_date DESC;`,
  },
];
