import { joinCauses, parseCauses, sharesCause } from './causes';

test('parses the comma-separated causes profiles store', () => {
  expect(parseCauses('Animals, Elderly')).toEqual(['Animals', 'Elderly']);
  expect(parseCauses('Animals,Elderly ,')).toEqual(['Animals', 'Elderly']);
  expect(parseCauses(null)).toEqual([]);
  expect(joinCauses(['Animals', 'Elderly'])).toBe('Animals, Elderly');
});

test('matches a student to an organization that shares a cause', () => {
  expect(sharesCause('Animals, Science', 'Elderly, Animals')).toBe(true);
  expect(sharesCause('Science', 'Elderly, Animals')).toBe(false);
  expect(sharesCause('', 'Animals')).toBe(false);
});

test('matches cause names saved before the current list', () => {
  expect(sharesCause('Sports&Fitness', 'Sports')).toBe(true);
  expect(sharesCause('Education', 'Cultural & Education')).toBe(true);
});
