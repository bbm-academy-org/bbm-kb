import type { InferPageType } from 'fumadocs-core/source';
import type { source } from '@/lib/source';

// Абсолютный домен базы знаний: относительные ссылки вида `](/meetings/...)`
// в скачиваемом .md не резолвятся (файл открывают вне сайта — в чате с
// агентом, в текстовом редакторе), поэтому переписываем их на абсолютные.
const SITE_ORIGIN = 'https://kb.bbm.academy';

// `includeProcessedMarkdown` (source.config.ts) не умеет вырезать служебные
// узлы: filterElement у remarkLLMs в fumadocs-core 16.10.7 молча игнорируется
// (см. комментарий там же), поэтому эти два блока — MDX-комментарий
// `{/* Сгенерировано… */}` и `<Callout>` с предупреждением о расшифровке —
// убираем текстовым постпроцессингом здесь. Формат обоих задаётся
// bbm-zoom-transcripts (BBMP-220), сама разметка неизменна между встречами.
const MDX_COMMENT = /\{\/\*[\s\S]*?\*\/\}\n*/g;
const CALLOUT_BLOCK = /<Callout\b[^>]*>[\s\S]*?<\/Callout>\n*/g;

type Page = InferPageType<typeof source>;

/**
 * Страницы встреч (саммари и расшифровки из bbm-zoom-transcripts, BBMP-220) —
 * единственные, для которых имеет смысл Markdown-версия: остальные страницы
 * базы собраны из SSOT-компонентов и в Markdown вышли бы пустыми.
 */
export function isMeetingPage(page: Page): boolean {
  const [section, ...rest] = page.slugs;
  if (section !== 'meetings' || rest.length === 0) return false;

  const last = rest[rest.length - 1];
  return last.endsWith('-summary') || last.endsWith('-transcript');
}

/** URL, по которому раздаётся Markdown-версия страницы встречи (шаг app/md). */
export function markdownUrl(page: Page): string {
  return `/md/${page.slugs.join('/')}.md`;
}

/**
 * Текст страницы встречи для отдачи как .md: заголовок из frontmatter
 * первой строкой (в отличие от `getText('raw')`, MDX-файлы его не содержат —
 * title живёт только в frontmatter) + обработанный Markdown без служебных
 * MDX-узлов (см. source.config.ts) со ссылками, переписанными на абсолютные.
 */
export async function getMeetingMarkdown(page: Page): Promise<string> {
  const processed = (await page.data.getText('processed'))
    .replace(MDX_COMMENT, '')
    .replace(CALLOUT_BLOCK, '');
  const title =
    typeof page.data.title === 'string' ? page.data.title : page.url;

  return `# ${title}\n\n${processed}`.replaceAll('](/', `](${SITE_ORIGIN}/`);
}
