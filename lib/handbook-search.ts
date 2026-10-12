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

export function createHandbookSearchClient(options: StaticOptions = {}): SearchClient {
  const base = oramaStaticClient(options);
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
      const preferredResults = results.filter((item) => item.url.split('#')[0] === url);
      // Promote an existing Fumadocs group, including heading hits. Never invent
      // a result when the built index or an active filter does not contain it.
      return [...preferredResults, ...results.filter((item) => item.url.split('#')[0] !== url)];
    },
  };
}
