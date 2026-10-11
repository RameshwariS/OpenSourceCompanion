import { describe, it, expect } from 'vitest';
import { languageForSkill } from '../src/constants/languages.js';

describe('languageForSkill', () => {
  it.each([
    ['Go', 'Go'],
    ['golang', 'Go'],
    ['  python ', 'Python'],
    ['Node.js', 'JavaScript'],
    ['TS', 'TypeScript'],
    ['C++', 'C++'],
    ['React', null],
    ['Docker', null],
  ])('%j -> %j', (skill, expected) => {
    expect(languageForSkill(skill)).toBe(expected);
  });
});