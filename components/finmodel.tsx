// Подстановка переменных финмодели из ssot/finmodel.yaml в content/finmodel/*.mdx.
// Контракт компонента <V k unit> общий с bbm-portal (рендер снапшота, BBMB-29):
// k — dot-путь по данным finmodel.yaml, unit — '%' | 'rub'. Числа переменных
// модели в MDX руками не пишутся — только через <V/> (STRICT 5 плана BBMB-29).
// Чтение на билде при каждом вызове, без кэша — по паттерну lib/ssot.ts
// (в next dev правка yaml видна при следующем рендере).
import fs from 'node:fs';
import path from 'node:path';
import { load as parseYaml } from 'js-yaml';

function getFinmodel(): unknown {
  const raw = fs.readFileSync(path.join(process.cwd(), 'ssot/finmodel.yaml'), 'utf8');
  return parseYaml(raw);
}

export function V({ k, unit }: { k: string; unit?: '%' | 'rub' }) {
  const value = k.split('.').reduce<unknown>((node, key) => {
    if (node === null || typeof node !== 'object') return undefined;
    return (node as Record<string, unknown>)[key];
  }, getFinmodel());
  if (typeof value !== 'number') {
    // Билд падает на опечатке в пути — рукописных чисел-фолбэков не существует.
    throw new Error(`finmodel: нет числовой переменной по пути «${k}» в ssot/finmodel.yaml`);
  }
  const formatted = value.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
  if (unit === '%') return <>{formatted}%</>;
  if (unit === 'rub') return <>{formatted}{' '}₽</>;
  return <>{formatted}</>;
}
