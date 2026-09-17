import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { runBinary } from './exec.js';
import { scannerFinding } from './finding.js';
import { hostAllowed, hostOf, type Scanner } from './types.js';

interface NmapPort {
  '@_protocol'?: string;
  '@_portid'?: string;
  state?: { '@_state'?: string };
  service?: { '@_name'?: string; '@_product'?: string; '@_version'?: string };
}

interface NmapHost {
  address?: { '@_addr'?: string } | { '@_addr'?: string }[];
  ports?: { port?: NmapPort | NmapPort[] };
}

interface NmapRun {
  host?: NmapHost | NmapHost[];
}

const SENSITIVE_PORTS: Record<string, string> = {
  '21': 'FTP',
  '22': 'SSH',
  '23': 'Telnet',
  '25': 'SMTP',
  '3306': 'MySQL',
  '3389': 'RDP',
  '5432': 'PostgreSQL',
  '5900': 'VNC',
  '6379': 'Redis',
  '9200': 'Elasticsearch',
  '27017': 'MongoDB',
};

export const nmapScanner: Scanner = {
  descriptor: {
    id: 'nmap',
    stage: 'attack-surface',
    label: 'Nmap',
    description: 'Port and service discovery on the target host.',
    source: 'dynamic',
    target: 'url',
    binaries: ['nmap'],
    install: {
      windows: 'winget install Insecure.Nmap',
      macos: 'brew install nmap',
      linux: 'sudo apt install nmap',
      docs: 'https://nmap.org/book/man.html',
    },
  },
  async run(ctx) {
    if (!ctx.targetUrl) return [];
    if (!hostAllowed(ctx.targetUrl, ctx.allowedHosts)) {
      throw new Error(
        'Target host is not in this project\'s allowlist - refusing to scan.',
      );
    }
    await mkdir(ctx.artifactDir, { recursive: true });
    const host = hostOf(ctx.targetUrl);
    const xmlPath = path.join(ctx.artifactDir, 'nmap.xml');
    ctx.onProgress?.(`Running nmap against ${host}`);
    await runBinary(
      'nmap',
      ['-sT', '-T3', '--top-ports', '100', '-Pn', '-oX', xmlPath, host],
      { timeoutMs: 600_000 },
    );

    let xml: string;
    try {
      xml = await readFile(xmlPath, 'utf8');
    } catch {
      return [];
    }
    const parsed = new XMLParser({ ignoreAttributes: false }).parse(xml) as {
      nmaprun?: NmapRun;
    };
    const hosts = parsed.nmaprun?.host;
    if (!hosts) return [];
    const hostList = Array.isArray(hosts) ? hosts : [hosts];

    const findings = [];
    for (const h of hostList) {
      const rawPorts = h.ports?.port;
      if (!rawPorts) continue;
      const ports = Array.isArray(rawPorts) ? rawPorts : [rawPorts];
      for (const port of ports) {
        if (port.state?.['@_state'] !== 'open') continue;
        const portId = port['@_portid'] ?? '?';
        const service = port.service?.['@_name'] ?? 'unknown';
        const label = SENSITIVE_PORTS[portId];
        findings.push(
          scannerFinding({
            prefix: 'NMAP',
            source: 'dynamic',
            category: 'security',
            domain: 'SECURITY',
            severity: label ? 'high' : 'info',
            title: `Open port ${portId}/${port['@_protocol'] ?? 'tcp'} (${service})`,
            description: label
              ? `${label} is reachable directly from the internet on ${host}:${portId}.`
              : `${service} is reachable on ${host}:${portId}.`,
            evidence: { url: `${host}:${portId}`, proof: 'confirmed' },
            recommendation: label
              ? `Restrict ${label} (port ${portId}) at the network/firewall layer; it should not be publicly exposed.`
              : 'Confirm this port must be publicly reachable; close it at the network layer if not.',
            correlationKeys: ['security'],
          }),
        );
      }
    }
    return findings;
  },
};
