import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

// Статический экспорт: индекс поиска выгружается в JSON на билде,
// сам поиск (Orama) выполняется на клиенте.
export const revalidate = false;

export const { staticGET: GET } = createFromSource(source);
