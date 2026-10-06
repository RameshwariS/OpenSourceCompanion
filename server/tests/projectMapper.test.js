import { describe, it, expect } from 'vitest';
import { languageBreakdown, mapEvents } from '../src/utils/projectMapper.js';
import { parseLastPage } from '../src/services/github.service.js';

describe('parseLastPage', () => {
  it('reads the page number of rel="last"', () => {
    const link =
      '<https://api.github.com/x?per_page=1&page=2>; rel="next", <https://api.github.com/x?per_page=1&page=87>; rel="last"';
    expect(parseLastPage(link)).toBe(87);
  });

  it.each([[undefined], [''], ['<https://api.github.com/x?page=2>; rel="next"']])('returns null for %j', (link) => {
    expect(parseLastPage(link)).toBeNull();
  });
});

describe('languageBreakdown', () => {
  it('converts bytes to sorted percentages', () => {
    expect(languageBreakdown({ CSS: 2000, TypeScript: 8000 })).toEqual([
      { name: 'TypeScript', percent: 80 },
      { name: 'CSS', percent: 20 },
    ]);
  });

  it('groups the long tail into "Other"', () => {
    const bytes = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`L${i}`, 100 - i]));
    const result = languageBreakdown(bytes);
    expect(result).toHaveLength(7);
    expect(result.at(-1).name).toBe('Other');
  });

  it('returns an empty list for no data', () => {
    expect(languageBreakdown({})).toEqual([]);
    expect(languageBreakdown(undefined)).toEqual([]);
  });
});

describe('mapEvents', () => {
  const event = (type, payload, id = '1') => ({ id, type, actor: { login: 'bob' }, created_at: '2026-03-01T00:00:00Z', payload });

  it('keeps opened/merged PRs, opened issues and releases, and drops noise', () => {
    const items = mapEvents(
      [
        event('PushEvent', { size: 3 }, '1'),
        event('PullRequestEvent', { action: 'closed', pull_request: { number: 12, title: 'Add thing', merged: true } }, '2'),
        event('PullRequestEvent', { action: 'closed', pull_request: { number: 13, title: 'Nope', merged: false } }, '3'),
        event('IssuesEvent', { action: 'opened', issue: { number: 5, title: 'Bug' } }, '4'),
        event('ReleaseEvent', { action: 'published', release: { tag_name: 'v1.0.0', name: '' } }, '5'),
        event('WatchEvent', {}, '6'),
      ],
      'acme/widgets',
    );

    expect(items.map((i) => i.kind)).toEqual(['pr_merged', 'issue_opened', 'release']);
    expect(items[0]).toMatchObject({ actor: 'bob', url: 'https://github.com/acme/widgets/pull/12' });
    expect(items[2]).toMatchObject({ title: 'v1.0.0', url: 'https://github.com/acme/widgets/releases/tag/v1.0.0' });
  });

  it('builds links itself instead of trusting URLs in the payload', () => {
    const [item] = mapEvents(
      [event('IssuesEvent', { action: 'opened', issue: { number: 5, title: 'x', html_url: 'javascript:alert(1)' } })],
      'acme/widgets',
    );
    expect(item.url).toBe('https://github.com/acme/widgets/issues/5');
  });

  it('respects the limit', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      event('IssuesEvent', { action: 'opened', issue: { number: i + 1, title: 't' } }, String(i)),
    );
    expect(mapEvents(many, 'acme/widgets', 10)).toHaveLength(10);
  });
});