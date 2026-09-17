const TEMPLATE_RULES: { template: string; patterns: RegExp[] }[] = [
  { template: 'event', patterns: [/\/events?\//i, /event/i] },
  { template: 'venue', patterns: [/\/venues?\//i, /venue/i] },
  { template: 'category', patterns: [/\/categor(y|ies)\//i, /category/i] },
  { template: 'location', patterns: [/\/locations?\//i, /location/i] },
  { template: 'product', patterns: [/\/products?\//i, /product/i] },
  { template: 'article', patterns: [/\/(articles?|blog|news|posts?)\//i, /\/blog\//i] },
  { template: 'search', patterns: [/\/search/i, /\/browse/i, /\/discover/i, /\/find/i, /[?&]q=/i, /\/query/i] },
  { template: 'tag', patterns: [/\/tags?\//i] },
  { template: 'author', patterns: [/\/authors?\//i] },
];

export function detectTemplate(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'other';
  }

  const path = parsed.pathname;
  if (path === '/' || path === '') return 'homepage';

  for (const rule of TEMPLATE_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(path)) return rule.template;
    }
  }

  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return 'homepage';

  const first = segments[0].toLowerCase();
  const named = TEMPLATE_RULES.find((r) =>
    r.patterns.some((p) => p.test(`/${first}/`)),
  );
  if (named) return named.template;

  if (/^\d+$/.test(segments[segments.length - 1] || '')) {
    return first;
  }

  return 'other';
}

export function templateLabel(template: string): string {
  if (!template || template === 'other') return 'Other';
  return template.charAt(0).toUpperCase() + template.slice(1);
}
