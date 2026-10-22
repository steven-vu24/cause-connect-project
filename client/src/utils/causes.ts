export const CAUSES = [
  'Animals',
  'Children & Youth',
  'Cultural & Education',
  'Disabilities',
  'Disaster Relief',
  'Elderly',
  'Environment',
  'Global – Local Based',
  'Health & Disease',
  'Homeless',
  'Hunger & Poverty',
  'International',
  'Military Charities',
  'Racial Equality',
  'Service & Benevolence Clubs',
  "Women's Issues",
  'Sports',
  'Music/Art',
  'Engineering',
  'Mathematics',
  'Science',
  'Social Justice',
];

export const parseCauses = (value: string | null | undefined) =>
  (value || '')
    .split(',')
    .map((cause) => cause.trim())
    .filter(Boolean);

export const joinCauses = (causes: string[]) => causes.join(', ');

// Profiles saved before the current list use older names such as
// "Sports&Fitness", so a cause matches when either name contains the other.
export function sharesCause(interests: string, causes: string) {
  const wanted = parseCauses(interests).map((interest) => interest.toLowerCase());
  return parseCauses(causes).some((cause) => {
    const name = cause.toLowerCase();
    return wanted.some((interest) => name.includes(interest) || interest.includes(name));
  });
}
