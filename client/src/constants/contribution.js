// Same order and values as the backend CONTRIBUTION_STATUSES
export const STATUSES = [
  { value: 'interested', label: 'Interested' },
  { value: 'planning', label: 'Planning' },
  { value: 'working', label: 'Working' },
  { value: 'pr_opened', label: 'PR opened' },
  { value: 'changes_requested', label: 'Changes requested' },
  { value: 'merged', label: 'Merged' },
  { value: 'closed', label: 'Closed' },
];

export const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.value, s.label]));