/**
 * URL and structured-data helpers shared by the SEO components and the product state.
 * Pure functions, so they run the same during server rendering and in the browser.
 */

// Product `images` strings can carry spin videos and YouTube links next to the photos.
// Extensionless CDN URLs are kept: only known video files and hosts are rejected.
const VIDEO_URL = /\.(mp4|webm|mov|m4v|ogv|m3u8)(?:[?#]|$)|youtube\.com|youtu\.be|vimeo\.com/i

export function isImageUrl(url: unknown): boolean {
	const value = String(url ?? '').trim()
	return !!value && !VIDEO_URL.test(value)
}

/** Splits a comma-joined `images` field and keeps image files only. */
export function imageUrls(images: unknown): string[] {
	if (!images) return []
	return String(images)
		.split(',')
		.map((i) => i.trim())
		.filter(isImageUrl)
}

/** The `page` search param as a whole number, or 1 when it is missing or invalid. */
export function pageNumber(url: URL): number {
	const raw = url.searchParams.get('page') || ''
	return /^\d+$/.test(raw) && +raw > 1 ? +raw : 1
}

/**
 * Self-canonical URL: origin and path, plus `?page=N` when N > 1 because each page lists
 * different products. Sort, filter, search and tracking params are dropped.
 */
export function canonicalUrl(url: URL): string {
	const n = pageNumber(url)
	return url.origin + url.pathname + (n > 1 ? `?page=${n}` : '')
}

/**
 * Link to page `n` of the current listing, keeping every other param (filters, sort).
 * Page 1 drops the param so the link matches the canonical URL.
 */
export function pageHref(url: URL, n: number): string {
	const next = new URL(url)
	if (n > 1) next.searchParams.set('page', String(Math.floor(n)))
	else next.searchParams.delete('page')
	return next.pathname + next.search
}

export type VariesByProperty = 'size' | 'color' | 'material'

/**
 * Maps an option or aggregation name ("Ring Size", "Metal Color", "Metal Type") to the variant
 * axes Google supports in `variesBy`. Other axes (carat, stone shape) have no schema property.
 */
export function variesByProperty(name: unknown): VariesByProperty | undefined {
	const value = String(name ?? '')
	if (/colou?r/i.test(value)) return 'color'
	if (/size/i.test(value)) return 'size'
	if (/material|metal/i.test(value)) return 'material'
	return undefined
}
