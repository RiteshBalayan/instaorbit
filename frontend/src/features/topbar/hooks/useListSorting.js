export const useListSorting = (items, filter, sortBy, sortDir, nameField = 'name', dateField = 'timestampRaw') => {
  const filtered = items.filter(item => (item[nameField] || '').toLowerCase().includes(filter.toLowerCase()));
  const sorted = filtered.slice().sort((a, b) => {
    if (sortBy === 'alpha') {
      const na = (a[nameField] || '').toLowerCase();
      const nb = (b[nameField] || '').toLowerCase();
      if (na < nb) return sortDir === 'asc' ? -1 : 1;
      if (na > nb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    }
    const dateA = a[dateField] ? new Date(a[dateField]).getTime() : 0;
    const dateB = b[dateField] ? new Date(b[dateField]).getTime() : 0;
    if (dateA < dateB) return sortDir === 'asc' ? -1 : 1;
    if (dateA > dateB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });
  return sorted;
};

export const toggleSort = (field, currentSortBy, currentSortDir, setSortBy, setSortDir) => {
  if (currentSortBy === field) {
    setSortDir(currentSortDir === 'asc' ? 'desc' : 'asc');
  } else {
    setSortBy(field);
    setSortDir(field === 'date' ? 'desc' : 'asc');
  }
};

export default useListSorting;
