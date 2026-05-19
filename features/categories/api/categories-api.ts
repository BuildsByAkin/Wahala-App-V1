// features/categories/api/categories-api.ts
// BACKEND.md §1 — server-side category taxonomy. Returns the 7 fixed
// categories with their colour triplets so the client doesn't have to ship
// a hard-coded palette. Falls back to constants/colors.ts when the network
// is down (see hooks/use-categories.ts consumers).
import { api } from '@/lib/api/axios';

export type CategoryId =
  | 'politics'
  | 'sports'
  | 'crypto'
  | 'culture'
  | 'weather'
  | 'news'
  | 'gist';

export type Category = {
  id: CategoryId | string;
  label: string;
  primaryColor: string;
  softColor: string;
  glowColor: string;
};

export const categoriesApi = {
  list: async (): Promise<Category[]> => {
    const { data } = await api.get<Category[] | { categories: Category[] }>(
      '/categories'
    );
    if (Array.isArray(data)) return data;
    if (data && Array.isArray((data as { categories?: Category[] }).categories)) {
      return (data as { categories: Category[] }).categories;
    }
    return [];
  },
};
