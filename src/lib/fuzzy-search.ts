function normalize(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[ą]/g, 'a')
    .replace(/[ć]/g, 'c')
    .replace(/[ę]/g, 'e')
    .replace(/[ł]/g, 'l')
    .replace(/[ń]/g, 'n')
    .replace(/[ó]/g, 'o')
    .replace(/[ś]/g, 's')
    .replace(/[źż]/g, 'z');
}

export function fuzzySearch(query: string, text: string): boolean {
  const normalizedQuery = normalize(query);
  const normalizedText = normalize(text);

  if (!normalizedQuery) return true;
  if (!normalizedText) return false;

  let queryIndex = 0;
  for (let i = 0; i < normalizedText.length; i++) {
    if (normalizedText[i] === normalizedQuery[queryIndex]) {
      queryIndex++;
      if (queryIndex === normalizedQuery.length) return true;
    }
  }
  return false;
}
