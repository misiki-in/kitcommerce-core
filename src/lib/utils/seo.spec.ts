// Self-check for the SEO URL helpers. No framework: run it with `bun run test`.
import assert from 'node:assert'
import { canonicalUrl, imageUrls, isImageUrl, pageHref, variesByProperty } from './seo.ts'

// Videos in the product `images` field never reach the schema image list.
assert.deepStrictEqual(imageUrls('https://x.io/a.webp, https://x.io/spin.mp4, https://x.io/b.jpg,https://youtu.be/abc'), [
	'https://x.io/a.webp',
	'https://x.io/b.jpg'
])
assert.strictEqual(isImageUrl('https://cdn.x.io/img/123?w=800'), true)
assert.strictEqual(isImageUrl('https://x.io/clip.webm?v=2'), false)
assert.deepStrictEqual(imageUrls(null), [])

// Page 2+ keeps its own canonical; sort, filters and tracking are dropped.
assert.strictEqual(canonicalUrl(new URL('https://s.io/rings?page=2&sort=price&utm_source=x')), 'https://s.io/rings?page=2')
assert.strictEqual(canonicalUrl(new URL('https://s.io/rings?page=1&attributes.Metal=Gold')), 'https://s.io/rings')
assert.strictEqual(canonicalUrl(new URL('https://s.io/rings?page=abc')), 'https://s.io/rings')

// Pagination links keep filters and sort; page 1 links to the bare listing.
const listing = new URL('https://s.io/products?sort=price&page=3&tags=gift')
assert.strictEqual(pageHref(listing, 4), '/products?sort=price&page=4&tags=gift')
assert.strictEqual(pageHref(listing, 1), '/products?sort=price&tags=gift')
assert.strictEqual(pageHref(new URL('https://s.io/products'), 2), '/products?page=2')

// Only Google's supported variant axes map to a property.
assert.strictEqual(variesByProperty('Metal Color'), 'color')
assert.strictEqual(variesByProperty('Ring Size'), 'size')
assert.strictEqual(variesByProperty('Metal Type'), 'material')
assert.strictEqual(variesByProperty('Carat Weight'), undefined)

console.log('seo.spec: all assertions passed')
