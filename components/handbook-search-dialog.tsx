'use client';

import { useMemo, useState } from 'react';
import { useDocsSearch } from 'fumadocs-core/search/client';
import {
  SearchDialog, SearchDialogClose, SearchDialogContent, SearchDialogFooter,
  SearchDialogHeader, SearchDialogIcon, SearchDialogInput, SearchDialogList,
  SearchDialogOverlay, TagsList, TagsListItem, type SharedProps,
} from 'fumadocs-ui/components/dialog/search';
import { createHandbookSearchClient } from '@/lib/handbook-search';

const suggestions = [
  { id: 'situations', type: 'page' as const, content: 'Подобрать инструмент по ситуации', url: '/teal-practices/situations' },
  { id: 'catalog', type: 'page' as const, content: 'Каталог бирюзовых практик', url: '/teal-practices/catalog' },
];

function EmptySearch() {
  return <p className="p-4 text-sm">Ничего не найдено. Попробуйте синоним или выберите «Вся база».</p>;
}

export default function HandbookSearchDialog(props: SharedProps) {
  const [tag, setTag] = useState<string>();
  const client = useMemo(() => createHandbookSearchClient({ tag }), [tag]);
  const { search, setSearch, query } = useDocsSearch({ client });

  return (
    <SearchDialog {...props} search={search} onSearchChange={setSearch} isLoading={query.isLoading}>
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput placeholder="Поиск: деньги, з/п, конфликт…" aria-label="Поиск по базе знаний" />
          <SearchDialogClose aria-label="Закрыть поиск" />
        </SearchDialogHeader>
        {query.error ? (
          <p role="alert" className="p-4 text-sm">Поиск временно недоступен. Попробуйте снова или откройте каталог.</p>
        ) : (
          <SearchDialogList
            items={query.data === 'empty' ? suggestions : query.data}
            Empty={EmptySearch}
          />
        )}
      </SearchDialogContent>
      <SearchDialogFooter>
        <TagsList tag={tag ?? 'all'} onTagChange={(value) => setTag(value === 'all' ? undefined : value)}>
          <TagsListItem value="all">Вся база</TagsListItem>
          <TagsListItem value="teal-practices">Бирюзовые практики</TagsListItem>
        </TagsList>
      </SearchDialogFooter>
    </SearchDialog>
  );
}
