// Чтение канонических фактов из ssot/ на билде (static export → выполняется
// только при сборке). Единственная точка доступа страниц к SSOT: страницы
// «Команда»/«Миссия»/«Экосистема» рендерятся из этих данных, рукописных
// копий фактов в content/ не существует (спека bbm-kb-design §4, BBMP-99).
import fs from 'node:fs';
import path from 'node:path';
import { load as parseYaml } from 'js-yaml';

const SSOT_DIR = path.join(process.cwd(), 'ssot');

function readYaml<T>(relPath: string): T {
  const raw = fs.readFileSync(path.join(SSOT_DIR, relPath), 'utf8');
  return parseYaml(raw) as T;
}

// --- team.yaml ---
export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  status: 'active' | 'inactive';
  timezone: string;
}

export function getTeam(): TeamMember[] {
  return readYaml<{ members: TeamMember[] }>('facts/team.yaml').members ?? [];
}

// --- company.yaml ---
export interface Entity {
  id: string;
  name: string;
  kind: 'holding' | 'client' | 'project';
  parent: string | null;
  description: string;
}

export function getEntities(): Entity[] {
  return readYaml<{ entities: Entity[] }>('facts/company.yaml').entities ?? [];
}

// --- services.yaml ---
export interface Host {
  id: string;
  provider: string;
  region: string;
  status: string;
  description: string;
}

export interface Service {
  id: string;
  name: string;
  domain: string | null;
  host: string | null;
  repo: string | null;
  status: 'prod' | 'staging' | 'planned' | 'retired';
  description: string;
}

export interface Storage {
  id: string;
  provider: string;
  class: string;
  description: string;
}

export interface Repo {
  id: string;
  remote: string | null;
  description: string;
}

export interface ExternalSystem {
  id: string;
  name: string;
  domain: string | null;
  description: string;
}

export interface Ecosystem {
  hosts: Host[];
  services: Service[];
  storage: Storage[];
  repos: Repo[];
  external: ExternalSystem[];
}

export function getEcosystem(): Ecosystem {
  const data = readYaml<Partial<Ecosystem>>('facts/services.yaml');
  return {
    hosts: data.hosts ?? [],
    services: data.services ?? [],
    storage: data.storage ?? [],
    repos: data.repos ?? [],
    external: data.external ?? [],
  };
}

// --- mission.md (frontmatter + markdown-тело) ---
export interface Mission {
  title: string;
  short: string;
  body: string; // markdown без frontmatter
}

export function getMission(): Mission {
  const raw = fs.readFileSync(path.join(SSOT_DIR, 'facts/mission.md'), 'utf8');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const fm = match ? (parseYaml(match[1]) as { title?: string; short?: string }) : {};
  const body = match ? raw.slice(match[0].length) : raw;
  return {
    title: fm.title ?? 'Миссия BBM',
    short: fm.short ?? '',
    body: body.trim(),
  };
}
