export const KNOWN_LANGUAGES = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#', 'C', 'PHP', 'Ruby', 'Kotlin', 'Swift', 'Dart', 'Shell',
];

// Common ways people write a language (or a runtime that implies one) in a skills list
const ALIASES = {
  js: 'JavaScript',
  node: 'JavaScript',
  nodejs: 'JavaScript',
  'node.js': 'JavaScript',
  ts: 'TypeScript',
  golang: 'Go',
  cpp: 'C++',
  csharp: 'C#',
  python3: 'Python',
  bash: 'Shell',
};

/** "golang" -> "Go", "Node.js" -> "JavaScript", "React" -> null (not a language). */
export function languageForSkill(skill) {
  const key = skill.trim().toLowerCase();
  return ALIASES[key] ?? KNOWN_LANGUAGES.find((l) => l.toLowerCase() === key) ?? null;
}