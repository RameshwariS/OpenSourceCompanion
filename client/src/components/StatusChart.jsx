import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { STATUSES } from '../constants/contribution';

export default function StatusChart({ byStatus }) {
  const data = STATUSES.map((s) => ({ name: s.label, count: byStatus[s.value] ?? 0 }));

  return (
    <div className="h-60 w-full" role="img" aria-label={data.map((d) => `${d.name}: ${d.count}`).join(', ')}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={60} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip cursor={{ fillOpacity: 0.1 }} />
          <Bar dataKey="count" name="Issues" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}