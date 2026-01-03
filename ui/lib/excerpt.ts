const DEFAULT_LENGTH = 160;

function stripMarkdown(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^>+/gm, " ")
    .replace(/[#*_~`+-]/g, " ")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function createExcerpt(markdown: string, length = DEFAULT_LENGTH) {
  const plain = stripMarkdown(markdown);
  if (plain.length <= length) {
    return plain;
  }

  return `${plain.slice(0, length).replace(/\s+?$/g, "")}…`;
}
