import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';

// Статический экспорт: индекс поиска выгружается в JSON на билде,
// сам поиск (Orama) выполняется на клиенте.
export const revalidate = false;

/**
 * Дословные расшифровки встреч попадают в индекс только названием, без текста.
 *
 * Индекс статический: браузер скачивает его целиком, прежде чем сможет искать.
 * После заливки архива встреч (91 страница расшифровок, 326 тысяч строк) он вырос
 * до 68 МБ и грузился 23 секунды — всё это время поиск по ВСЕЙ базе знаний не
 * находил ничего. Расшифровка — сотни килобайт машинного текста на встречу, тогда
 * как саммари той же встречи весит единицы килобайт и содержит то же по смыслу:
 * темы, главы, договорённости. Поэтому ищем по саммари, а расшифровку находим
 * по названию и открываем ссылкой с её страницы.
 *
 * Полнотекстовый поиск по дословным расшифровкам потребует серверного поиска
 * вместо клиентского — это отдельная задача.
 */
function isTranscriptPage(url: string): boolean {
  return url.includes('/meetings/') && url.endsWith('-transcript');
}

const EMPTY: StructuredData = { headings: [], contents: [] };

export const { staticGET: GET } = createFromSource(source, {
  async buildIndex(page) {
    const data = page.data as {
      title?: string;
      description?: string;
      structuredData?: StructuredData | (() => Promise<StructuredData>);
      load?: () => Promise<{ structuredData: StructuredData }>;
    };

    let structuredData: StructuredData = EMPTY;

    if (!isTranscriptPage(page.url)) {
      if (typeof data.structuredData === 'function') {
        structuredData = await data.structuredData();
      } else if (data.structuredData) {
        structuredData = data.structuredData;
      } else if (typeof data.load === 'function') {
        structuredData = (await data.load()).structuredData;
      } else {
        throw new Error(`нет structuredData для страницы ${page.url}`);
      }
    }

    return {
      id: page.url,
      url: page.url,
      title: data.title ?? page.url,
      description: data.description,
      structuredData,
    };
  },
});
