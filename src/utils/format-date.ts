/**
 * Format a date as YYYY-MM-DD for consistent date comparison
 * @param date The date to format
 * @returns A string in YYYY-MM-DD format
 */
export function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}