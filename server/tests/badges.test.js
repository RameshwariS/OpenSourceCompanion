import { describe, it, expect } from 'vitest';
import { computeBadges } from '../src/services/badge.service.js';

const earnedIds = (metrics) =>
  computeBadges(metrics).filter((b) => b.earned).map((b) => b.id);

describe('computeBadges', () => {
  it('awards nothing to a brand-new contributor', () => {
    expect(earnedIds({ mergedExternalPRs: 0, openedExternalPRs: 0, longestStreak: 0 })).toEqual([]);
  });

  it('awards the first-contribution badge for one merged PR', () => {
    expect(earnedIds({ mergedExternalPRs: 1, openedExternalPRs: 1, longestStreak: 1 })).toEqual(['first-contribution']);
  });

  it('awards every badge at the thresholds', () => {
    expect(earnedIds({ mergedExternalPRs: 5, openedExternalPRs: 10, longestStreak: 7 })).toHaveLength(4);
  });

  it('always lists every badge so the UI can show what is left to earn', () => {
    expect(computeBadges({ mergedExternalPRs: 0, openedExternalPRs: 0, longestStreak: 0 })).toHaveLength(4);
  });
});