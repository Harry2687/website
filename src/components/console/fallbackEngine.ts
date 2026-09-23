import aboutData from '../../data/about.json';
import careerData from '../../data/career.json';
import educationData from '../../data/education.json';
import researchData from '../../data/research.json';
import { formatDuration, getAge, getInclusiveMonths } from './dateUtils';

export interface FallbackQueryResult {
  rows: Record<string, any>[];
  columns: string[];
}

export function executeFallbackQuery(sqlQuery: string): FallbackQueryResult {
  const q = sqlQuery.toLowerCase().trim();
  let data: Record<string, any>[] = [];

  if (q.includes('union') || q.includes('timeline')) {
    const dob = aboutData[0]?.date_of_birth || '2001-06-25';
    const items = [
      ...careerData.map((c) => ({
        organization: c.company,
        title: c.role,
        location: c.location,
        track: 'Industry',
        start_date: c.start_date,
        end_date: c.end_date,
      })),
      ...educationData.map((e) => ({
        organization: e.institution,
        title: e.qualification,
        location: e.location,
        track: 'Academic',
        start_date: e.start_date,
        end_date: e.end_date,
      })),
    ].sort((a, b) => (b.start_date > a.start_date ? 1 : -1));

    data = items.map((item) => ({
      organization: item.organization,
      title: item.title,
      location: item.location,
      track: item.track,
      dates: `${item.start_date} to ${item.end_date || 'Present'}`,
      age_at_start: getAge(dob, item.start_date),
      duration: formatDuration(getInclusiveMonths(item.start_date, item.end_date)),
    }));
  } else if (q.includes('join')) {
    data = educationData
      .map((e) => {
        const r = researchData.find((res) => res.institution === e.institution);
        return {
          institution: e.institution,
          qualification: e.qualification,
          start_date: e.start_date,
          end_date: e.end_date,
          thesis_title: r ? r.title : null,
          link: r ? r.link : null,
        };
      })
      .sort((a, b) => (b.start_date > a.start_date ? 1 : -1));
  } else if (q.includes('group by') || q.includes('roles_held')) {
    const map: Record<string, { company: string; roles_held: number; total_months: number }> = {};
    for (const exp of careerData) {
      if (!map[exp.company]) {
        map[exp.company] = { company: exp.company, roles_held: 0, total_months: 0 };
      }
      map[exp.company].roles_held += 1;
      map[exp.company].total_months += getInclusiveMonths(exp.start_date, exp.end_date);
    }
    data = Object.values(map)
      .sort((a, b) => b.total_months - a.total_months)
      .map((g) => ({
        company: g.company,
        roles_held: g.roles_held,
        total_months: g.total_months,
        total_years: Math.round((g.total_months / 12.0) * 10) / 10,
      }));
  } else if (q.includes('about')) {
    const parts = q.split(/\bfrom\b/i);
    const selectClause = parts[0]?.replace(/^select\s+/i, '').replace(/\([^)]*\)/g, '') || '';
    const wantsDob = q.includes('*') || /\bdate_of_birth\b/i.test(selectClause);
    const wantsPhoto = q.includes('*') || /\bphoto\b/i.test(selectClause);
    const latestRole = [...careerData].sort((a, b) => {
      const dateA = a.start_date ?? '9999-12-31';
      const dateB = b.start_date ?? '9999-12-31';
      return dateB.localeCompare(dateA);
    })[0];
    const derivedLocation = latestRole?.location ?? null;
    if (q.includes('age')) {
      data = aboutData.map((a: any) => {
        const row: Record<string, any> = {
          name: a.name,
          location: derivedLocation,
          contact: a.contact,
        };
        if (wantsDob) row.date_of_birth = a.date_of_birth;
        row.age = getAge(a.date_of_birth);
        if (wantsPhoto) row.photo = a.photo || '/profile.jpg';
        return row;
      });
    } else {
      data = aboutData.map((a: any) => ({
        name: a.name,
        location: derivedLocation,
        contact: a.contact,
        ...(wantsDob ? { date_of_birth: a.date_of_birth } : {}),
        ...(wantsPhoto ? { photo: a.photo || '/profile.jpg' } : {}),
      }));
    }
  } else if (
    q.includes('datediff') ||
    q.includes('months') ||
    q.includes('years') ||
    q.includes('tenure') ||
    q.includes('duration')
  ) {
    data = careerData.map((c) => {
      const months = getInclusiveMonths(c.start_date, c.end_date);
      const years = Math.round((months / 12.0) * 10) / 10;
      return {
        company: c.company,
        role: c.role,
        location: c.location,
        start_date: c.start_date,
        end_date: c.end_date ?? new Date().toISOString().split('T')[0],
        months,
        years,
      };
    });
  } else if (q.includes('experience') || q.includes('career')) {
    data = careerData.map((c) => ({
      role: c.role,
      company: c.company,
      location: c.location,
      start_date: c.start_date,
      end_date: c.end_date ?? null,
      domain: c.domain,
    }));
  } else if (q.includes('education')) {
    data = [...educationData];
  } else if (q.includes('research') || q.includes('thesis')) {
    data = [...researchData];
  } else {
    throw new Error('Table not found. Available tables: about, experience, education, research');
  }

  const columns = data.length > 0 ? Object.keys(data[0]) : [];
  return { rows: data, columns };
}
