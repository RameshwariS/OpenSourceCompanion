// Makes user input safe to put inside a RegExp: "c++" matches the text "c++", not a pattern.
export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');