/**
 * Custom hook for list sorting and filtering logic
 * Provides sorting functionality for both date and alphabetical sorting
 * @param {Array} items - Items to sort and filter
 * @param {string} filter - Filter text
 * @param {string} sortBy - Sort field ('date' or 'alpha')
 * @param {string} sortDir - Sort direction ('asc' or 'desc')
 * @param {string} nameField - Name of the field to filter/sort by name
 * @param {string} dateField - Name of the field containing date info
 * @returns {Array} Filtered and sorted items
 */
export const useListSorting = (items, filter, sortBy, sortDir, nameField = 'name', dateField = 'timestampRaw') => {
  // Filter by name
  const filtered = items.filter(item => 
    (item[nameField] || '').toLowerCase().includes(filter.toLowerCase())
  );

  // Sort
  const sorted = filtered.slice().sort((a, b) => {
    if (sortBy === 'alpha') {
      const na = (a[nameField] || '').toLowerCase();
      const nb = (b[nameField] || '').toLowerCase();
      if (na < nb) return sortDir === 'asc' ? -1 : 1;
      if (na > nb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    }
    
    // Date sorting
    const dateA = a[dateField] ? new Date(a[dateField]).getTime() : 0;
    const dateB = b[dateField] ? new Date(b[dateField]).getTime() : 0;
    if (dateA < dateB) return sortDir === 'asc' ? -1 : 1;
    if (dateA > dateB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
};

/**
 * Toggle sort field or direction
 * @param {string} field - Field to sort by ('alpha' or 'date')
 * @param {string} currentSortBy - Current sort field
 * @param {string} currentSortDir - Current sort direction
 * @param {Function} setSortBy - Setter for sortBy
 * @param {Function} setSortDir - Setter for sortDir
 */
export const toggleSort = (field, currentSortBy, currentSortDir, setSortBy, setSortDir) => {
  if (currentSortBy === field) {
    // Toggle direction if same field
    setSortDir(currentSortDir === 'asc' ? 'desc' : 'asc');
  } else {
    // Switch field and use default direction
    setSortBy(field);
    setSortDir(field === 'date' ? 'desc' : 'asc');
  }
};
