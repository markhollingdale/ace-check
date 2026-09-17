import { MODULE_CATALOG } from './module-catalog.js';

export interface AuditProfile {
  id: string;
  label: string;
  description: string;
  moduleNumbers: number[];
}

const ALL = MODULE_CATALOG.map((m) => m.number);

export const AUDIT_PROFILES: AuditProfile[] = [
  {
    id: 'web-app',
    label: 'Web Application',
    description: 'Full-stack web app — every review.',
    moduleNumbers: ALL,
  },
  {
    id: 'nextjs',
    label: 'Next.js Application',
    description: 'Web app on Next.js — every review.',
    moduleNumbers: ALL,
  },
  {
    id: 'api',
    label: 'API / Backend',
    description: 'Headless API — drops accessibility and SEO.',
    moduleNumbers: ALL.filter((n) => n !== 80 && n !== 90),
  },
  {
    id: 'content-site',
    label: 'Content Site',
    description: 'Marketing/content — SEO, accessibility, performance, security.',
    moduleNumbers: [10, 20, 30, 60, 70, 80, 90, 100, 110, 120],
  },
  {
    id: 'ecommerce',
    label: 'E-commerce',
    description: 'Storefront — every review, business-logic emphasis.',
    moduleNumbers: ALL,
  },
  {
    id: 'saas',
    label: 'SaaS',
    description: 'Multi-tenant SaaS — every review, tenancy emphasis.',
    moduleNumbers: ALL,
  },
];

export function profileById(id: string): AuditProfile | undefined {
  return AUDIT_PROFILES.find((p) => p.id === id);
}
