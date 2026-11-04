export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Lowercase ASCII slug. Returns '' when nothing usable remains (caller decides the fallback). */
export function slugify(input: string, maxLength = 80): string {
  const base = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base.slice(0, maxLength).replace(/-+$/g, '')
}
