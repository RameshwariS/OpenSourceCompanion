import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBookmarks } from '../hooks/useBookmarks';
import { getErrorMessage } from '../utils/getErrorMessage';
import IssueCard from '../components/IssueCard';
import BookmarkButton from '../components/BookmarkButton';
import EmptyState from '../components/EmptyState';
import { IssueCardSkeleton } from '../components/Skeleton';

const field = 'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900';

export default function BookmarksPage() {
  const [filters, setFilters] = useState({ sort: 'newest', difficulty: '', language: '', q: '' });
  const update = (e) => setFilters((f) => ({ ...f, [e.target.name]: e.target.value }));

  // Drop empty filters before they reach the API
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v.trim() !== ''));
  const { data: bookmarks, isLoading, isError, error } = useBookmarks(params);
  const hasFilters = Boolean(filters.difficulty || filters.language || filters.q);

  return (
    <section>
      <h1 className="text-2xl font-bold tracking-tight">Bookmarks</h1>

      <div className="mt-4 flex flex-wrap gap-3">
        <input name="q" value={filters.q} onChange={update} placeholder="Filter by title or repo" aria-label="Filter by title or repository" className={field} />
        <input name="language" value={filters.language} onChange={update} placeholder="Language" aria-label="Language" className={`${field} w-36`} />
        <select name="difficulty" value={filters.difficulty} onChange={update} aria-label="Difficulty" className={field}>
          <option value="">Any difficulty</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <select name="sort" value={filters.sort} onChange={update} aria-label="Sort" className={field}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      <div className="mt-6" aria-live="polite">
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <IssueCardSkeleton key={i} />
            ))}
          </div>
        )}

        {isError && (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {getErrorMessage(error)}
          </p>
        )}

        {bookmarks?.length === 0 && (
          <EmptyState
            title={hasFilters ? 'No bookmarks match these filters' : 'No bookmarks yet'}
            description={hasFilters ? undefined : 'Save issues you like and they will show up here.'}
          >
            {!hasFilters && (
              <Link to="/issues" className="text-emerald-500 hover:underline">
                Explore issues
              </Link>
            )}
          </EmptyState>
        )}

        {bookmarks?.length > 0 && (
          <div className="space-y-3">
            {bookmarks.map((b) => (
              <IssueCard
                key={b.id}
                issue={b.issue}
                actions={<BookmarkButton issue={{ ...b.issue, bookmarkId: b.id }} />}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}