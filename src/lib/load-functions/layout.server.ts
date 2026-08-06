import { StoreService } from '$lib/services'
import type { LayoutServerLoad } from '$lib/types/index.ts'
import { getStore } from '$lib/utils/get-store.ts'

export const load: LayoutServerLoad = async ({ locals, url, cookies, fetch, request }) => {
	let storeDetails = locals?.storeDetails
	if (!storeDetails) {
		const storeId = cookies.get('litekart_store_id')
		if (storeId) {
			const storeService = new StoreService(fetch)
			storeDetails = await getStore({ storeId }, storeService)
			if (storeDetails) {
				locals.storeDetails = storeDetails
			} else {
				throw new Error('Layout: Store not found..')
			}
		} else {
			throw new Error('Layout: Store not found.')
		}
	}
	// `store` is serialized into the hydration payload of EVERY page, and on a real catalogue the
	// store object runs ~186KB raw — of which `megamenu` alone is ~109KB (59%).
	//
	// Nothing consumes it. Its only reader is MegaMenuRenderer, which resolves it in onMount (so it
	// is never used during SSR), and every storefront's consumer of that renderer destructures
	// `headerItems` — sourced from `store.menu` — which shadows the megamenu value. Verified across
	// all 10 varni storefronts: the only `store.megamenu` reads are vendored copies of
	// MegaMenuRenderer itself. NavModule likewise builds its own `megaMenu` from
	// categoryService.getMegamenu() in onMount rather than from here.
	//
	// Measured on jws PDP: document 704,690 -> 585,756 bytes raw, 110,200 -> 94,404 gzip.
	//
	// NOT stripped here: `menu` (~26KB) renders the header nav during SSR — removing it drops the
	// nav links from the crawlable HTML (10 -> 4 anchors, measured). `countries` (~31KB) is read
	// live by checkout and profile pages across the fleet.
	const { megamenu: _megamenu, ...store } = storeDetails
	return {
		// Copy rather than delete in place — `locals.storeDetails` is shared with hooks.server.ts.
		store
	}
}

