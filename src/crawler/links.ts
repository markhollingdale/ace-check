import { parse } from 'node-html-parser';

export function extractLinks(html: string, baseUrl: string): string[] {
  const root = parse(html);
  const links = new Set<string>();
  for (const a of root.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href');
    if (href) links.add(href.trim());
  }
  return [...links];
}
