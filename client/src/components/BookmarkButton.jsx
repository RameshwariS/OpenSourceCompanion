import { useAddBookmark, useRemoveBookmark } from '../hooks/useBookmarks';

// `issue` needs: repoFullName, number, bookmarkId (null when not bookmarked)
export default function BookmarkButton({ issue }) {
  const add = useAddBookmark();
  const remove = useRemoveBookmark();
  const bookmarked = Boolean(issue.bookmarkId);
  const pending = add.isPending || remove.isPending;

  const toggle = () =>
    bookmarked ? remove.mutate(issue.bookmarkId) : add.mutate({ repo: issue.repoFullName, number: issue.number });

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={bookmarked}
      className={`rounded-md border px-3 py-1 text-xs disabled:opacity-60 ${
        bookmarked
          ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
          : 'border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
      }`}
    >
      {bookmarked ? '★ Bookmarked' : '☆ Bookmark'}
    </button>
  );
}