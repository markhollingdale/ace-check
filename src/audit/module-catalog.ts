export interface ModuleCatalogEntry {
  number: number;
  title: string;
  prefix: string;
  category: string;
  domain: string;
  consumesWebScan: boolean;
}

export const MODULE_CATALOG: ModuleCatalogEntry[] = [
  { number: 10, title: 'Architecture', prefix: 'ARCH', category: 'architecture', domain: 'ARCHITECTURE', consumesWebScan: false },
  { number: 20, title: 'Security', prefix: 'SEC', category: 'security', domain: 'SECURITY', consumesWebScan: false },
  { number: 30, title: 'Performance', prefix: 'PERF', category: 'performance', domain: 'PERFORMANCE', consumesWebScan: true },
  { number: 40, title: 'Database', prefix: 'DB', category: 'database', domain: 'DATABASE', consumesWebScan: false },
  { number: 50, title: 'API', prefix: 'API', category: 'api', domain: 'API', consumesWebScan: false },
  { number: 60, title: 'Code Quality', prefix: 'CQ', category: 'code-quality', domain: 'CODE_QUALITY', consumesWebScan: false },
  { number: 70, title: 'TypeScript', prefix: 'TS', category: 'typescript', domain: 'CODE_QUALITY', consumesWebScan: false },
  { number: 80, title: 'Accessibility', prefix: 'A11Y', category: 'accessibility', domain: 'ACCESSIBILITY', consumesWebScan: true },
  { number: 90, title: 'SEO', prefix: 'SEO', category: 'seo', domain: 'SEO', consumesWebScan: true },
  { number: 100, title: 'Production Readiness', prefix: 'PR', category: 'production-readiness', domain: 'PRODUCTION', consumesWebScan: false },
  { number: 110, title: 'Cost Analysis', prefix: 'COST', category: 'cost-analysis', domain: 'COST', consumesWebScan: false },
  { number: 120, title: 'Maintainability', prefix: 'MAINT', category: 'maintainability', domain: 'MAINTAINABILITY', consumesWebScan: false },
  { number: 150, title: 'Testing', prefix: 'TST', category: 'testing', domain: 'TESTING', consumesWebScan: false },
  { number: 160, title: 'Business Logic', prefix: 'BL', category: 'business-logic', domain: 'BUSINESS_LOGIC', consumesWebScan: false },
  { number: 170, title: 'Privacy & Compliance', prefix: 'PRIV', category: 'privacy-compliance', domain: 'PRIVACY', consumesWebScan: false },
  { number: 180, title: 'Portability & Reusability', prefix: 'PORT', category: 'portability', domain: 'PORTABILITY', consumesWebScan: false },
];

export const CATALOG_BY_PREFIX: Record<string, ModuleCatalogEntry> =
  Object.fromEntries(MODULE_CATALOG.map((m) => [m.prefix, m]));
