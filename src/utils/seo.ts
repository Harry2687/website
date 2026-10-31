import aboutData from '../data/about.json';
import careerData from '../data/career.json';
import educationData from '../data/education.json';
import researchData from '../data/research.json';

export function getProfileData() {
  const profile = aboutData[0];

  const sortedCareer = [...careerData].sort((a, b) => {
    const dateA = a.start_date ?? '9999-12-31';
    const dateB = b.start_date ?? '9999-12-31';
    return dateB.localeCompare(dateA);
  });

  const latestRole = sortedCareer[0];
  const role = latestRole.role;
  const company = latestRole.company;
  const location = latestRole.location;

  const [city, region] = location.includes(',')
    ? location.split(',').map((s) => s.trim())
    : [location, undefined];

  const headline = `${role} at ${company}`;
  const defaultTitle = profile.name;
  const defaultDescription = `${profile.name} - ${headline} in ${location}, Australia. Interactive SQL portfolio, career timeline, education, and research.`;

  const sameAsLinks = [profile.linkedin, profile.github].filter((url): url is string =>
    Boolean(url)
  );

  const knownDomains = Array.from(
    new Set([...careerData.map((c) => c.domain), ...researchData.map((r) => r.domain)])
  );

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': 'https://harryzhong.com/#website',
        url: 'https://harryzhong.com',
        name: profile.name,
        description: defaultDescription,
        publisher: {
          '@id': 'https://harryzhong.com/#person',
        },
      },
      {
        '@type': 'Person',
        '@id': 'https://harryzhong.com/#person',
        name: profile.name,
        url: 'https://harryzhong.com',
        image: `https://harryzhong.com${profile.photo}`,
        jobTitle: role,
        worksFor: {
          '@type': 'Organization',
          name: company,
          ...(company === 'Commonwealth Bank'
            ? {
                url: 'https://www.commbank.com.au',
                address: {
                  '@type': 'PostalAddress',
                  addressLocality: city,
                  ...(region ? { addressRegion: region } : {}),
                  addressCountry: 'AU',
                },
              }
            : {}),
        },
        address: {
          '@type': 'PostalAddress',
          addressLocality: city,
          ...(region ? { addressRegion: region } : {}),
          addressCountry: 'AU',
        },
        homeLocation: {
          '@type': 'Place',
          name: `${location}, Australia`,
        },
        alumniOf: Array.from(new Set(educationData.map((edu) => edu.institution))).map(
          (institution) => ({
            '@type': 'EducationalOrganization',
            name: institution,
          })
        ),
        sameAs: sameAsLinks,
        knowsAbout: knownDomains,
      },
    ],
  };

  return {
    profile,
    latestRole,
    role,
    company,
    location,
    headline,
    defaultTitle,
    defaultDescription,
    jsonLd,
  };
}
