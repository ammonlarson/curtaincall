'use client';

import { useState, useMemo } from 'react';

interface UseTableControlsOptions<T> {
  searchFields: (keyof T)[];
  defaultSort: keyof T;
  defaultDirection?: 'asc' | 'desc';
  pageSize?: number;
}

interface UseTableControlsReturn<T> {
  searchText: string;
  setSearchText: (text: string) => void;
  sortField: keyof T;
  sortDirection: 'asc' | 'desc';
  toggleSort: (field: keyof T) => void;
  page: number;
  setPage: (page: number) => void;
  paginatedItems: T[];
  filteredItems: T[];
  totalPages: number;
}

export function useTableControls<T>(
  items: T[],
  options: UseTableControlsOptions<T>
): UseTableControlsReturn<T> {
  const { searchFields, defaultSort, defaultDirection = 'asc', pageSize = 20 } = options;

  const [searchText, setSearchText] = useState('');
  const [sortField, setSortField] = useState<keyof T>(defaultSort);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(defaultDirection);
  const [page, setPage] = useState(1);

  const filteredItems = useMemo(() => {
    if (!searchText.trim()) return items;
    const query = searchText.toLowerCase();
    return items.filter((item) =>
      searchFields.some((field) => {
        const value = item[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(query);
        }
        if (typeof value === 'number') {
          return String(value).includes(query);
        }
        return false;
      })
    );
  }, [items, searchText, searchFields]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
        comparison = aVal === bVal ? 0 : aVal ? -1 : 1;
      } else {
        comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredItems, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, safePage, pageSize]);

  const toggleSort = (field: keyof T) => {
    if (field === sortField) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(1);
  };

  const handleSetSearchText = (text: string) => {
    setSearchText(text);
    setPage(1);
  };

  return {
    searchText,
    setSearchText: handleSetSearchText,
    sortField,
    sortDirection,
    toggleSort,
    page: safePage,
    setPage,
    paginatedItems,
    filteredItems: sortedItems,
    totalPages,
  };
}
