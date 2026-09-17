export interface RobotsResult {
  sitemaps: string[];
  userAgent: string;
  disallow: string[];
  allow: string[];
}

const DEFAULT_USER_AGENT =
  'acecheck/0.1 (+https://github.com/ace-check/ace-check)';

function wildcardToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\$$/, '$');
  return new RegExp(`^${escaped}`);
}

export function parseRobots(content: string, userAgent?: string): RobotsResult {
  const result: RobotsResult = {
    sitemaps: [],
    userAgent: userAgent || '*',
    disallow: [],
    allow: [],
  };

  const lines = content.split(/\r?\n/);
  let currentAgent = '*';
  const agents: Record<string, { disallow: string[]; allow: string[] }> = {};

  const ensure = (agent: string) => {
    if (!agents[agent]) agents[agent] = { disallow: [], allow: [] };
    return agents[agent];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === 'user-agent') {
      currentAgent = value.toLowerCase();
      ensure(currentAgent);
    } else if (key === 'sitemap') {
      if (value) result.sitemaps.push(value);
    } else if (key === 'disallow') {
      if (value) ensure(currentAgent).disallow.push(value);
    } else if (key === 'allow') {
      if (value) ensure(currentAgent).allow.push(value);
    }
  }

  const matches = (agent: string): boolean => {
    if (agent === '*') return true;
    const a = agent.toLowerCase();
    const requested = (userAgent || '*').toLowerCase();
    return requested.includes(a) || a.includes(requested);
  };

  for (const agent of Object.keys(agents)) {
    if (matches(agent)) {
      result.disallow.push(...agents[agent].disallow);
      result.allow.push(...agents[agent].allow);
    }
  }

  return result;
}

export function isAllowed(
  pathname: string,
  robots: RobotsResult,
): boolean {
  for (const rule of robots.allow) {
    if (rule === '' || wildcardToRegex(rule).test(pathname)) return true;
  }
  for (const rule of robots.disallow) {
    if (rule === '') continue;
    if (wildcardToRegex(rule).test(pathname)) return false;
  }
  return true;
}

export async function fetchRobots(
  origin: string,
  userAgent = DEFAULT_USER_AGENT,
  timeoutMs = 15_000,
): Promise<RobotsResult | null> {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return null;
  }
  const robotsUrl = `${url.origin}/robots.txt`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(robotsUrl, {
      signal: controller.signal,
      headers: { 'user-agent': userAgent },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const text = await res.text();
    return parseRobots(text, userAgent);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
