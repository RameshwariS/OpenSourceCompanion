import { describe, it, expect } from 'vitest';
import { classifyDifficulty } from '../src/services/difficulty.service.js';

describe('classifyDifficulty', () => {
  it.each([
    [['good first issue'], 'beginner'],
    [['good-first-issue'], 'beginner'],
    [['Good First Issue 🌱'], 'beginner'],
    [['first-timers-only'], 'beginner'],
    [['help wanted'], 'intermediate'],
    [['bug', 'Medium'], 'intermediate'],
    [['bug', 'refactor'], 'advanced'],
    [[], 'advanced'],
  ])('%j -> %s', (labels, expected) => {
    expect(classifyDifficulty(labels)).toBe(expected);
  });

  it('prefers beginner over intermediate when both are present', () => {
    expect(classifyDifficulty(['help wanted', 'good first issue'])).toBe('beginner');
  });

  it('lets a complexity label override a beginner label', () => {
    expect(classifyDifficulty(['good first issue', 'hard'])).toBe('advanced');
  });
});