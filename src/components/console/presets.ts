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
    label: 'Education & Research',
    sql: `SELECT 
  e.institution,
  e.qualification,
  e.start_date,
  e.end_date,
  r.title AS thesis_title,
  r.link
FROM education e
LEFT JOIN research r 
  ON e.institution = r.institution
ORDER BY e.start_date DESC;`,
  },
  {
    label: 'Unified Timeline',
    sql: `WITH timeline AS (
  SELECT company AS organization, role AS title, location, start_date, end_date, 'Industry' AS track FROM experience
  UNION ALL
  SELECT institution AS organization, qualification AS title, location, start_date, end_date, 'Academic' AS track FROM education
),
calculated AS (
  SELECT 
    organization,
    title,
    location,
    track,
    start_date,
    end_date,
    CASE 
      WHEN start_date > CURRENT_DATE AND end_date IS NULL THEN 0
      ELSE DATEDIFF('month', start_date, COALESCE(end_date, CURRENT_DATE)) + 1 
    END AS total_months
  FROM timeline
)
SELECT 
  organization,
  title,
  location,
  track,
  start_date || ' to ' || COALESCE(end_date::VARCHAR, 'Present') AS dates,
  DATEDIFF('year', date_of_birth, start_date) - 
    CASE WHEN strftime(start_date, '%m%d') < strftime(date_of_birth, '%m%d') THEN 1 ELSE 0 END AS age_at_start,
  CASE 
    WHEN total_months >= 12 AND total_months % 12 > 0 THEN 
      (total_months // 12) || ' yr' || CASE WHEN total_months // 12 > 1 THEN 's ' ELSE ' ' END || 
      (total_months % 12) || ' mo' || CASE WHEN total_months % 12 > 1 THEN 's' ELSE '' END
    WHEN total_months >= 12 THEN 
      (total_months // 12) || ' yr' || CASE WHEN total_months // 12 > 1 THEN 's' ELSE '' END
    ELSE 
      total_months || ' mo' || CASE WHEN total_months = 1 THEN '' ELSE 's' END
  END AS duration
FROM calculated
CROSS JOIN about
ORDER BY start_date DESC;`,
  },
];
