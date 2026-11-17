import { oramaStaticClient } from 'fumadocs-core/search/client/orama-static';
import type { SearchClient, StaticOptions } from 'fumadocs-core/search/client';

// Exact everyday queries should lead to a tool, ahead of catalogues mentioning it.
// Longer queries keep normal full-text ranking throughout the knowledge base.
const shortcuts: Record<string, string> = {
  деньги: 'compensation', оплата: 'compensation', зарплата: 'compensation',
  зарплаты: 'compensation', оклад: 'compensation', получка: 'compensation',
  вознаграждение: 'compensation', повышение: 'compensation', индексация: 'compensation',
  salary: 'compensation', compensation: 'compensation', 'сколько платить': 'compensation',
  'фонд оплаты труда': 'compensation', фот: 'compensation',
  премия: 'profit-sharing', бонус: 'profit-sharing', прибыль: 'profit-sharing',
  закупка: 'purchases', покупка: 'purchases', расход: 'purchases',
  бюджет: 'budgeting', конфликт: 'conflicts', спор: 'conflicts', медиация: 'conflicts',
  clou: 'roles', обязанности: 'roles', ответственность: 'roles',
  перегрузка: 'role-market', 'рынок ролей': 'role-market',
  'три вопроса': 'feedback', 'обратная связь': 'feedback',
  intervisie: 'peer-coaching', интервизия: 'peer-coaching',
  онбординг: 'onboarding', onboarding: 'onboarding', адаптация: 'onboarding',
  найм: 'hiring', собеседование: 'hiring', отпуск: 'flexible-work', график: 'flexible-work',
  увольнение: 'exit', фасилитация: 'meetings', 'пустой стул': 'purpose',
  s3: 's3-consent', consent: 's3-consent', cobudget: 'cobudget', patagonia: 'stewardship',
};

const HANDBOOK_TAG = 'teal-practices';
const admitsHandbook = (tag: StaticOptions['tag']) =>
  tag === undefined || (Array.isArray(tag) ? tag.every((t) => t === HANDBOOK_TAG) : tag === HANDBOOK_TAG);

export function createHandbookSearchClient(options: StaticOptions = {}): SearchClient {
  const base = oramaStaticClient(options);
  const handbook = oramaStaticClient({ ...options, tag: HANDBOOK_TAG });
  return {
    deps: base.deps,
    async search(query) {
      const key = query.trim().toLocaleLowerCase('ru').replace(/\s+/g, ' ');
      // Orama splits punctuation into short letters, so these abbreviations need
      // a searchable canonical word. Do not alter other punctuation or queries.
      const isSalaryAbbreviation = /^з\s*[/.]?\s*п\.?$/u.test(key);
      const preferred = isSalaryAbbreviation ? 'compensation' : shortcuts[key];
      const results = await base.search(isSalaryAbbreviation ? 'зарплата' : query);
      if (!preferred) return results;
      const url = `/teal-practices/${preferred}`;
      const isPreferred = (item: { url: string }) => item.url.split('#')[0] === url;
      let preferredResults = results.filter(isPreferred);
      // Fumadocs caps a search at 60 hits: a large page elsewhere in the KB (a registry
      // with hundreds of matching rows) can push the tool out of the cap. Then look the
      // same query up inside the handbook itself — a real search of the built index,
      // only when the active filter admits the handbook.
      if (preferredResults.length === 0 && admitsHandbook(options.tag)) {
        const inHandbook = await handbook.search(isSalaryAbbreviation ? 'зарплата' : query);
        preferredResults = inHandbook.filter(isPreferred);
      }
      // Promote an existing Fumadocs group, including heading hits. Never invent
      // a result when the built index or an active filter does not contain it.
      return [...preferredResults, ...results.filter((item) => !isPreferred(item))];
    },
  };
}
