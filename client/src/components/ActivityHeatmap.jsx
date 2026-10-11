// Dark mode needs lighter greens for "more activity", light mode needs darker ones.
const LEVELS = [
  'bg-slate-200 dark:bg-slate-800',
  'bg-emerald-200 dark:bg-emerald-900',
  'bg-emerald-400 dark:bg-emerald-700',
  'bg-emerald-500 dark:bg-emerald-500',
  'bg-emerald-700 dark:bg-emerald-300',
];
const level = (count) => (count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 6 ? 3 : 4);

// `days` is oldest-first, ending today. Columns are weeks, rows are Sunday..Saturday.
export default function ActivityHeatmap({ days, total }) {
  const lead = new Date(`${days[0].date}T00:00:00Z`).getUTCDay();
  const cells = [...Array(lead).fill(null), ...days];

  return (
    <div className="overflow-x-auto pb-1">
      <div
        role="img"
        aria-label={`${total} contributions in the last 13 weeks`}
        className="grid w-max gap-1"
        style={{ gridAutoFlow: 'column', gridTemplateRows: 'repeat(7, 0.85rem)', gridAutoColumns: '0.85rem' }}
      >
        {cells.map((day, i) =>
          day ? (
            <div
              key={day.date}
              title={`${day.count} ${day.count === 1 ? 'activity' : 'activities'} on ${day.date}`}
              className={`rounded-sm ${LEVELS[level(day.count)]}`}
            />
          ) : (
            <div key={`pad-${i}`} />
          ),
        )}
      </div>
    </div>
  );
}