/**
 * Поиск «Вся база» не тонет в справочных таблицах.
 *
 * Fumadocs отдаёт не больше 60 результатов на запрос. Справочные страницы
 * пакета «Производство контента DS» (реестр, трассировка, глоссарий, ставки,
 * черновые часы) — тысячи строк таблиц; проиндексированные целиком, они
 * занимали все 60 мест по общим словам («курс» — 60 из 60), и остальная база
 * по таким запросам не находилась. Поэтому app/api/search/route.ts индексирует
 * их только заголовком, описанием и разделами. Проверка — на реальном
 * выгруженном индексе тем же клиентом, что и в браузере; запускать после
 * npm run build.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { oramaStaticClient } from 'fumadocs-core/search/client/orama-static';

const PACKAGE = '/processes/ds-content-production';
// Общие слова, которые есть и в пакете, и в других разделах базы.
const QUERIES = ['курс', 'эксперт', 'менеджер', 'подкаст', 'договор'];
// Справочные таблицы — в индексе только заголовком, описанием и разделами
// (REFERENCE_TABLE_PAGES в app/api/search/route.ts).
const REFERENCE_TABLE_PAGES = ['registry-ru', 'registry-trace-ru', 'glossary-ru', 'rates/rates-ru',
  'model/effort-draft-ru'].map((slug) => `${PACKAGE}/${slug}`);

const raw = await readFile(path.join(process.cwd(), 'out/api/search'), 'utf8')
  .catch(() => readFile(path.join(process.cwd(), 'out/api/search.json'), 'utf8'))
  .catch(() => assert.fail('Search export missing; run npm run build first'));
const index = JSON.parse(raw);
// Одна текстовая запись на страницу — её description (Fumadocs кладёт его без
// якоря); всё сверх этого — строки таблиц.
for (const url of REFERENCE_TABLE_PAGES) {
  const texts = Object.values(index.docs.docs).filter((doc) => doc.type === 'text'
    && String(doc.url).split('#')[0] === url);
  assert(texts.length <= 1 && texts.every((doc) => doc.url === url),
    `${url}: ${texts.length} text records in the search index — table rows leak in`);
}
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => new Response(raw, { headers: { 'Content-Type': 'application/json' } });
try {
  const client = oramaStaticClient({ from: 'search-crowding-export' });
  for (const query of QUERIES) {
    const results = await client.search(query);
    const inPackage = results.filter((r) => r.url.startsWith(PACKAGE)).length;
    const outside = new Set(results.filter((r) => !r.url.startsWith(PACKAGE)).map((r) => r.url.split('#')[0]));
    console.log(`${query}: ${results.length} hits — package ${inPackage}, other ${results.length - inPackage} (${outside.size} pages)`);
    assert(outside.size > 0, `«${query}»: «Вся база» returned only package pages`);
  }
} finally {
  globalThis.fetch = originalFetch;
}
console.log(`OK: ${QUERIES.length} generic queries reach the rest of the KB; index ${(Buffer.byteLength(raw) / 1024 / 1024).toFixed(2)} MiB.`);
