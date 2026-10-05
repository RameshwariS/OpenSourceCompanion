import { useState } from 'react';

const LANGUAGES = ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#', 'C', 'PHP', 'Ruby', 'Kotlin', 'Swift', 'Dart', 'Shell'];

const toForm = (p) => ({
  q: p.q ?? '',
  language: p.language ?? '',
  repo: p.repo ?? '',
  org: p.org ?? '',
  labels: p.labels ?? '',
  difficulty: p.difficulty ?? '',
  goodFirstIssue: p.goodFirstIssue === 'true',
  helpWanted: p.helpWanted === 'true',
  minStars: p.minStars ?? '',
  sort: p.sort ?? 'updated',
});

// Only send filters that are actually set
function toParams(form) {
  const out = {};
  for (const [key, value] of Object.entries(form)) {
    if (value === false) continue;
    const text = value === true ? 'true' : String(value).trim();
    if (text) out[key] = text;
  }
  if (out.sort === 'updated') delete out.sort; // server default
  return out;
}

const input =
  'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900';

export default function IssueFilters({ initial, onSearch }) {
  const [form, setForm] = useState(() => toForm(initial));

  const update = (e) => {
    const { name, type, checked, value } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(toParams(form));
      }}
      className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
    >
      <label htmlFor="q" className="block text-sm font-medium">
        Search issues
      </label>
      <input id="q" name="q" value={form.q} onChange={update} maxLength={80} placeholder="e.g. documentation typo" className={input} />

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="language" className="block text-sm font-medium">Language</label>
          <select id="language" name="language" value={form.language} onChange={update} className={input}>
            <option value="">Any</option>
            {form.language && !LANGUAGES.includes(form.language) && <option>{form.language}</option>}
            {LANGUAGES.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="difficulty" className="block text-sm font-medium">Difficulty (estimated)</label>
          <select id="difficulty" name="difficulty" value={form.difficulty} onChange={update} className={input}>
            <option value="">Any</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced*</option>
          </select>
        </div>
        <div>
          <label htmlFor="org" className="block text-sm font-medium">Organization</label>
          <input id="org" name="org" value={form.org} onChange={update} placeholder="e.g. kubernetes" className={input} />
        </div>
        <div>
          <label htmlFor="repo" className="block text-sm font-medium">Repository</label>
          <input id="repo" name="repo" value={form.repo} onChange={update} placeholder="owner/name" className={input} />
        </div>
        <div>
          <label htmlFor="labels" className="block text-sm font-medium">Labels (comma separated, max 3)</label>
          <input id="labels" name="labels" value={form.labels} onChange={update} placeholder="documentation, bug" className={input} />
        </div>
        <div>
          <label htmlFor="minStars" className="block text-sm font-medium">Min stars*</label>
          <input id="minStars" name="minStars" type="number" min="0" value={form.minStars} onChange={update} className={input} />
        </div>
        <div>
          <label htmlFor="sort" className="block text-sm font-medium">Sort by</label>
          <select id="sort" name="sort" value={form.sort} onChange={update} className={input}>
            <option value="updated">Recently updated</option>
            <option value="created">Newest</option>
            <option value="comments">Most commented</option>
          </select>
        </div>
        <fieldset className="flex items-end gap-4 pb-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="goodFirstIssue" checked={form.goodFirstIssue} onChange={update} /> Good first issue
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="helpWanted" checked={form.helpWanted} onChange={update} /> Help wanted
          </label>
        </fieldset>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
          Search
        </button>
        <button type="button" onClick={() => onSearch({})} className="text-sm text-slate-500 hover:underline">
          Clear filters
        </button>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Difficulty is our <strong>estimate</strong> based on labels, not an official GitHub classification. *Advanced and
        Min stars are applied to each page of results after GitHub returns it, so a page can show fewer than 20 issues.
      </p>
    </form>
  );
}