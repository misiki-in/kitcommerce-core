/**
 * Sorts product option values (sizes, carats, lengths, metal colours).
 *
 * A plain `.sort()` is lexical, so it orders "10" before "2". Sorting everything on a leading
 * number instead collapses every non-numeric value to 0, and a stable sort then leaves those in
 * whatever order the API returned — losing the alphabetical order colours actually want.
 *
 * So: compare numerically when both sides carry a number, alphabetically otherwise.
 */
export function sortByNumericValue(arr: string[]): string[] {
	return [...(arr || [])].sort((a, b) => {
		const na = Number(String(a).match(/[0-9.]+/)?.[0])
		const nb = Number(String(b).match(/[0-9.]+/)?.[0])
		if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb
		return String(a).localeCompare(String(b), undefined, { numeric: true })
	})
}

/**
 * Splits a comma-joined list of image URLs.
 *
 * Review images arrive as one comma-joined string, but S3 keys can themselves contain commas,
 * so a plain `split(',')` tears a single URL into fragments. Only treat a comma as a separator
 * when the next non-space character starts a new http(s) URL.
 */
export function splitOnCommaBeforeHttp(str: unknown): string[] {
	if (!str) return []
	return String(str).split(/,(?=\s*https?:\/\/)/)
}
