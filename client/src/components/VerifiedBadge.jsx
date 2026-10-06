export default function VerifiedBadge({ verified }) {
  return verified ? (
    <span
      title="The person who listed this owns the repository, or is a public member of its GitHub organization."
      className="text-xs font-medium text-emerald-600 dark:text-emerald-400"
    >
      ✓ Verified maintainer
    </span>
  ) : (
    <span
      title="Listed by a community member whose ownership of the repository has not been verified."
      className="text-xs text-slate-500"
    >
      Community listed
    </span>
  );
}