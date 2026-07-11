// React-компоненты поверх данных ssot/ — используются в content/**/*.mdx.
// Никакого собственного контента: только рендер канонических фактов
// (lib/ssot.ts) на билде. Правка ssot/*.yaml → пересборка → страница меняется.
import Markdown from 'react-markdown';
import {
  getTeam,
  getEntities,
  getEcosystem,
  getMission,
} from '@/lib/ssot';

// --- «Команда» (ssot/facts/team.yaml) ---
export function TeamTable() {
  const members = getTeam();
  return (
    <table>
      <thead>
        <tr>
          <th>Имя</th>
          <th>Роль</th>
          <th>Email</th>
          <th>Статус</th>
          <th>Таймзона</th>
        </tr>
      </thead>
      <tbody>
        {members.map((m) => (
          <tr key={m.id}>
            <td>{m.name}</td>
            <td>{m.role}</td>
            <td>
              <a href={`mailto:${m.email}`}>{m.email}</a>
            </td>
            <td>{m.status === 'active' ? 'активен' : 'неактивен'}</td>
            <td>{m.timezone}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// --- «Миссия» (ssot/facts/mission.md) ---
export function MissionShort() {
  const mission = getMission();
  return <blockquote>{mission.short}</blockquote>;
}

export function MissionBody() {
  const mission = getMission();
  return <Markdown>{mission.body}</Markdown>;
}

// --- Сущности холдинга (ssot/facts/company.yaml) ---
const KIND_LABEL: Record<string, string> = {
  holding: 'холдинг',
  client: 'клиент',
  project: 'проект',
};

export function EntitiesList() {
  const entities = getEntities();
  return (
    <table>
      <thead>
        <tr>
          <th>Сущность</th>
          <th>Тип</th>
          <th>Родитель</th>
          <th>Описание</th>
        </tr>
      </thead>
      <tbody>
        {entities.map((e) => (
          <tr key={e.id}>
            <td>{e.name}</td>
            <td>{KIND_LABEL[e.kind] ?? e.kind}</td>
            <td>{e.parent ? entities.find((p) => p.id === e.parent)?.name ?? e.parent : '—'}</td>
            <td>{e.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// --- «Экосистема» (ssot/facts/services.yaml) ---
const STATUS_LABEL: Record<string, string> = {
  prod: 'prod',
  staging: 'staging',
  planned: 'план',
  retired: 'выведен',
};

function RepoLink({ repo }: { repo: string | null }) {
  if (!repo) return <>—</>;
  // В yaml repo может сопровождаться комментарием — здесь всегда чистый owner/repo.
  return <a href={`https://github.com/${repo}`}>{repo}</a>;
}

export function EcosystemHosts() {
  const { hosts } = getEcosystem();
  return (
    <table>
      <thead>
        <tr>
          <th>Хост</th>
          <th>Провайдер</th>
          <th>Регион</th>
          <th>Статус</th>
          <th>Назначение</th>
        </tr>
      </thead>
      <tbody>
        {hosts.map((h) => (
          <tr key={h.id}>
            <td>
              <code>{h.id}</code>
            </td>
            <td>{h.provider}</td>
            <td>{h.region}</td>
            <td>{STATUS_LABEL[h.status] ?? h.status}</td>
            <td>{h.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function EcosystemServices() {
  const { services } = getEcosystem();
  return (
    <table>
      <thead>
        <tr>
          <th>Сервис</th>
          <th>Домен</th>
          <th>Хост</th>
          <th>Репозиторий</th>
          <th>Статус</th>
          <th>Описание</th>
        </tr>
      </thead>
      <tbody>
        {services.map((s) => (
          <tr key={s.id}>
            <td>{s.name}</td>
            <td>{s.domain ? <code>{s.domain}</code> : '—'}</td>
            <td>{s.host ? <code>{s.host}</code> : '—'}</td>
            <td>
              <RepoLink repo={s.repo} />
            </td>
            <td>{STATUS_LABEL[s.status] ?? s.status}</td>
            <td>{s.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function EcosystemStorage() {
  const { storage } = getEcosystem();
  return (
    <table>
      <thead>
        <tr>
          <th>Бакет</th>
          <th>Провайдер</th>
          <th>Класс</th>
          <th>Назначение</th>
        </tr>
      </thead>
      <tbody>
        {storage.map((s) => (
          <tr key={s.id}>
            <td>
              <code>{s.id}</code>
            </td>
            <td>{s.provider}</td>
            <td>{s.class}</td>
            <td>{s.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function EcosystemRepos() {
  const { repos } = getEcosystem();
  return (
    <table>
      <thead>
        <tr>
          <th>Репозиторий</th>
          <th>Remote</th>
          <th>Назначение</th>
        </tr>
      </thead>
      <tbody>
        {repos.map((r) => (
          <tr key={r.id}>
            <td>
              <code>{r.id}</code>
            </td>
            <td>
              <RepoLink repo={r.remote} />
            </td>
            <td>{r.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function EcosystemExternal() {
  const { external } = getEcosystem();
  return (
    <table>
      <thead>
        <tr>
          <th>Система</th>
          <th>Домен</th>
          <th>Связь с BBM</th>
        </tr>
      </thead>
      <tbody>
        {external.map((e) => (
          <tr key={e.id}>
            <td>{e.name}</td>
            <td>{e.domain ? <code>{e.domain}</code> : '—'}</td>
            <td>{e.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
