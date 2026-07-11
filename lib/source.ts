import { docs } from '@/.source/server';
import { loader } from 'fumadocs-core/source';

// Один loader от корня сайта: content/company → /company и т.д.
export const source = loader({
  baseUrl: '/',
  source: docs.toFumadocsSource(),
});
