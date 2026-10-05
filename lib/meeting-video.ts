import fs from 'node:fs';
import path from 'node:path';
import type { InferPageType } from 'fumadocs-core/source';
import type { source } from '@/lib/source';
import { isMeetingPage } from '@/lib/meeting-markdown';

type Page = InferPageType<typeof source>;

export type MeetingVideoInfo = {
  id: string;
  source: 'upload' | 'live';
};

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const VIDEO_SOURCES = ['upload', 'live'] as const;

// Реестр месяца читаем один раз за сборку: страниц встреч сотни, а файлов
// meetings.json — по одному на месяц. `null` в кэше = файла нет или он битый.
const registryCache = new Map<string, Map<string, unknown> | null>();

function loadRegistry(year: string, month: string): Map<string, unknown> | null {
  const key = `${year}/${month}`;
  if (registryCache.has(key)) return registryCache.get(key) ?? null;

  let result: Map<string, unknown> | null = null;
  try {
    const file = path.join(
      process.cwd(),
      'content',
      'meetings',
      year,
      month,
      'meetings.json',
    );
    const data: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
    const meetings = (data as { meetings?: unknown } | null)?.meetings;
    if (Array.isArray(meetings)) {
      result = new Map();
      for (const m of meetings) {
        const base = (m as { base?: unknown } | null)?.base;
        if (typeof base === 'string') {
          result.set(base, (m as { video?: unknown }).video);
        }
      }
    }
  } catch {
    // Нет файла или битый JSON — видео просто не показываем, сборка не падает.
    result = null;
  }

  registryCache.set(key, result);
  return result;
}

/**
 * Видео встречи для страницы саммари/расшифровки: поле `video` из реестра
 * месяца `content/meetings/ГГГГ/ММ/meetings.json` (его дописывает сервис
 * bbm-zoom-transcripts). Любая неполадка — нет файла, встречи, поля,
 * невалидный id или source — даёт `null`: плеер не рисуется.
 */
export function getMeetingVideo(page: Page): MeetingVideoInfo | null {
  if (!isMeetingPage(page)) return null;

  // meetings / ГГГГ / ММ / <base>-summary|-transcript
  const [, year, month, name] = page.slugs;
  if (!year || !month || !name || page.slugs.length !== 4) return null;

  const base = name.replace(/-(summary|transcript)$/, '');
  const video = loadRegistry(year, month)?.get(base);
  if (!video || typeof video !== 'object') return null;

  const { id, source: src } = video as { id?: unknown; source?: unknown };
  if (typeof id !== 'string' || !VIDEO_ID.test(id)) return null;
  if (!(VIDEO_SOURCES as readonly unknown[]).includes(src)) return null;

  return { id, source: src as MeetingVideoInfo['source'] };
}
