// Badges are computed on read from GitHub-verified numbers, never stored.
// Adding a badge later = adding one line here, and every user gets it retroactively.
const BADGES = [
  {
    id: 'first-contribution',
    emoji: '🌱',
    label: 'First Contribution',
    description: "Get a pull request merged into someone else's repository",
    test: (m) => m.mergedExternalPRs >= 1,
  },
  {
    id: 'five-merged',
    emoji: '🚀',
    label: '5 PRs Merged',
    description: "Get 5 pull requests merged into other people's repositories",
    test: (m) => m.mergedExternalPRs >= 5,
  },
  {
    id: 'ten-contributions',
    emoji: '⭐',
    label: '10 Contributions',
    description: "Open 10 pull requests on other people's repositories",
    test: (m) => m.openedExternalPRs >= 10,
  },
  {
    id: 'seven-day-streak',
    emoji: '🔥',
    label: '7 Day Streak',
    description: "Take part in other people's projects 7 days in a row (last 90 days)",
    test: (m) => m.longestStreak >= 7,
  },
];

export function computeBadges(metrics) {
  return BADGES.map(({ test, ...badge }) => ({ ...badge, earned: test(metrics) }));
}