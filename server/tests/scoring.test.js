import { describe, it, expect } from 'vitest';
import { rankIssues, scoreIssue, WEIGHTS } from '../src/services/recommendationScoring.js';

const NOW = new Date('2026-03-10T00:00:00Z');

const issue = (over = {}) => ({
  githubId: 1,
  title: 'Fix docs',
  repoFullName: 'acme/widgets',
  language: 'Go',
  labels: [],
  difficulty: 'advanced',
  stars: 10,
  updatedAt: '2026-01-01T00:00:00Z',
  ...over,
});
const profile = (over = {}) => ({ languages: [], skillTerms: [], activityLanguages: [], ...over });
const label = (name) => ({ name, color: 'ffffff' });

describe('scoreIssue', () => {
  it('scores zero when nothing matches', () => {
    expect(scoreIssue(issue(), profile(), NOW)).toEqual({ score: 0, reasons: [] });
  });

  it('gives +5 for a language match, ignoring case', () => {
    const { score, reasons } = scoreIssue(issue(), profile({ languages: ['go'] }), NOW);
    expect(score).toBe(WEIGHTS.languageMatch);
    expect(reasons[0]).toMatch(/Go/);
  });

  it('matches a skill as a whole word in the title', () => {
    const p = profile({ skillTerms: ['Docker'] });
    expect(scoreIssue(issue({ title: 'Add Docker support' }), p, NOW).score).toBe(5);
    expect(scoreIssue(issue({ title: 'Dockerfile cleanup' }), p, NOW).score).toBe(0);
  });

  it('matches a skill inside a label such as area/react', () => {
    const p = profile({ skillTerms: ['React'] });
    expect(scoreIssue(issue({ labels: [label('area/react')] }), p, NOW).score).toBe(5);
  });

  it('matches multi-word skills as a phrase', () => {
    const p = profile({ skillTerms: ['machine learning'] });
    expect(scoreIssue(issue({ title: 'Improve machine learning docs' }), p, NOW).score).toBe(5);
  });

  it('counts skill matches only once', () => {
    const p = profile({ skillTerms: ['Docker', 'Kubernetes'] });
    expect(scoreIssue(issue({ title: 'Docker and Kubernetes guide' }), p, NOW).score).toBe(5);
  });

  it('adds beginner (+4) and help wanted (+2)', () => {
    const result = scoreIssue(issue({ difficulty: 'beginner', labels: [label('Help-Wanted')] }), profile(), NOW);
    expect(result.score).toBe(6);
  });

  it('adds +2 for activity in the same language', () => {
    expect(scoreIssue(issue(), profile({ activityLanguages: ['Go'] }), NOW).score).toBe(2);
  });

  it('rewards recently updated issues only within 7 days', () => {
    expect(scoreIssue(issue({ updatedAt: '2026-03-05T00:00:00Z' }), profile(), NOW).score).toBe(2);
    expect(scoreIssue(issue({ updatedAt: '2026-03-02T00:00:00Z' }), profile(), NOW).score).toBe(0);
  });

  it('rewards popularity from 1000 stars', () => {
    expect(scoreIssue(issue({ stars: 1000 }), profile(), NOW).score).toBe(1);
    expect(scoreIssue(issue({ stars: 999 }), profile(), NOW).score).toBe(0);
    expect(scoreIssue(issue({ stars: null }), profile(), NOW).score).toBe(0);
  });

  it('adds everything up and explains each point', () => {
    const result = scoreIssue(
      issue({
        title: 'Docker docs',
        difficulty: 'beginner',
        labels: [label('help wanted')],
        stars: 5000,
        updatedAt: '2026-03-09T00:00:00Z',
      }),
      profile({ languages: ['Go'], skillTerms: ['Docker'] }),
      NOW,
    );
    expect(result.score).toBe(5 + 5 + 4 + 2 + 2 + 1);
    expect(result.reasons).toHaveLength(6);
  });
});

describe('rankIssues', () => {
  it('sorts by score, then recency, then id, without mutating the input', () => {
    const input = [
      issue({ githubId: 3, updatedAt: '2026-01-01T00:00:00Z' }),
      issue({ githubId: 2, difficulty: 'beginner' }),
      issue({ githubId: 1, updatedAt: '2026-02-01T00:00:00Z' }),
    ];
    const ranked = rankIssues(input, profile(), NOW);

    expect(ranked.map((i) => i.githubId)).toEqual([2, 1, 3]);
    expect(input.map((i) => i.githubId)).toEqual([3, 2, 1]);
    expect(ranked[0]).toHaveProperty('score', 4);
  });
});