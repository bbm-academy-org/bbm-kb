'use client';

import { RootProvider } from 'fumadocs-ui/provider/next';
import { lazy, type ReactNode } from 'react';

const HandbookSearchDialog = lazy(() => import('@/components/handbook-search-dialog'));

export function Providers({ children }: { children: ReactNode }) {
  return (
    <RootProvider search={{ SearchDialog: HandbookSearchDialog }}>
      {children}
    </RootProvider>
  );
}
