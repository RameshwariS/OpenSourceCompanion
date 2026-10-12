import { describe, it, expect } from 'vitest';
import { activityCounts, activityDays, buildActivitySeries, computeStreaks } from '../src/services/activity.service.js';
const now = new Date('2026-03-10T12:00:00Z');

describe('computeStreaks', () => {
  it('returns zero for no activity', () => {
    expect(computeStreaks([], now)).toEqual({ current: 0, longest: 0 });
  });

  it('counts consecutive days ending today', () => {
    expect(computeStreaks(['2026-03-08', '2026-03-09', '2026-03-10'], now)).toEqual({ current: 3, longest: 3 });
  });

  it('keeps the streak alive if the last activity was yesterday', () => {
    expect(computeStreaks(['2026-03-08', '2026-03-09'], now).current).toBe(2);
  });

  it('resets the current streak after a missed day, but remembers the longest', () => {
    const result = computeStreaks(['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-08'], now);
    expect(result).toEqual({ current: 0, longest: 4 });
  });

  it('ignores duplicate days', () => {
    expect(computeStreaks(['2026-03-10', '2026-03-10'], now)).toEqual({ current: 1, longest: 1 });
  });
});

describe('activityDays', () => {
  const ev = (type, repo, day) => ({ type, repo: { name: repo }, created_at: `${day}T10:00:00Z` });

  it('counts only participation events on other people\'s repositories', () => {
    const days = activityDays(
      [
        ev('PullRequestEvent', 'acme/widgets', '2026-03-01'),
        ev('IssueCommentEvent', 'Alice/own', '2026-03-02'), // own repo (case-insensitive)
        ev('PushEvent', 'acme/widgets', '2026-03-03'), // pushes never count
        ev('IssuesEvent', 'acme/other', '2026-03-01'), // same day as the first: counted once
      ],
      'alice',
    );
    expect(days).toEqual(['2026-03-01']);
  });
});

describe('activityCounts and buildActivitySeries', () => {
  const ev = (type, repo, day) => ({ type, repo: { name: repo }, created_at: `${day}T10:00:00Z` });

  it('counts events per day, skipping own repositories and pushes', () => {
    const counts = activityCounts(
      [
        ev('PullRequestEvent', 'acme/widgets', '2026-03-01'),
        ev('IssuesEvent', 'acme/other', '2026-03-01'),
        ev('IssueCommentEvent', 'alice/own', '2026-03-01'),
        ev('PushEvent', 'acme/widgets', '2026-03-02'),
      ],
      'alice',
    );
    expect(Object.fromEntries(counts)).toEqual({ '2026-03-01': 2 });
  });

  it('builds 91 consecutive days ending today with zeros filled in', () => {
    const now = new Date('2026-03-10T12:00:00Z');
    const { days, total } = buildActivitySeries(new Map([['2026-03-10', 3], ['2026-03-01', 2]]), now);

    expect(days).toHaveLength(91);
    expect(days.at(-1)).toEqual({ date: '2026-03-10', count: 3 });
    expect(days.find((d) => d.date === '2026-03-02').count).toBe(0);
    expect(total).toBe(5);
    // consecutive days, no gaps
    const gaps = days.slice(1).map((d, i) => Date.parse(d.date) - Date.parse(days[i].date));
    expect(new Set(gaps)).toEqual(new Set([86_400_000]));
  });
});
