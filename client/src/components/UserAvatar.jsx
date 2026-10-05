export default function UserAvatar({ name, src, size = 'h-16 w-16' }) {
  if (src) return <img src={src} alt="" className={`${size} rounded-full object-cover`} />;
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  return (
    <div
      aria-hidden="true"
      className={`${size} flex items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300`}
    >
      {initials}
    </div>
  );
}