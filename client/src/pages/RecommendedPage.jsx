import { useRecommended } from '../hooks/useRecommendations';
import RecommendedIssues from '../components/RecommendedIssues';

const WEIGHT_LABELS = {
  languageMatch: 'The issue\'s language is one of your skills',
  skillMatch: 'One of your other skills appears in the title, labels or repository name',
  activityMatch: 'You have tracked or bookmarked issues in this language before',
  goodFirstIssue: 'Beginner-friendly labels',
  helpWanted: 'The "help wanted" label',
  recentlyUpdated: 'Updated in the last 7 days',
  popularity: 'The repository has 1,000+ stars',
};

export default function RecommendedPage() {
  // Same query key as the list below, so React Query shares one request
  const { data } = useRecommended(30);

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Recommended for you</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Issues are scored with simple, transparent rules. Issues you already track are hidden.
      </p>

      <div className="mt-6">
        <RecommendedIssues limit={30} />
      </div>

      {data?.weights && (
        <details className="mt-8 rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-800">
          <summary className="cursor-pointer font-medium">How the score works</summary>
          <table className="mt-3 w-full text-left">
            <tbody>
              {Object.entries(data.weights).map(([key, points]) => (
                <tr key={key} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-1.5 pr-3">{WEIGHT_LABELS[key]}</td>
                  <td className="py-1.5 text-right font-medium">+{points}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-slate-500">
            This is a rule-based estimate, not machine learning. Ties go to the most recently updated issue.
          </p>
        </details>
      )}
    </section>
  );
}