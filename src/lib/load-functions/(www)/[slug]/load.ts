import { SearchService } from '$lib/services'
import type { PageLoad } from '$lib/types/index.js'

export const load: PageLoad = async ({ url, params, fetch }) => {
	const searchService = new SearchService(fetch)
	try {
		const products = await searchService.searchWithUrl(url, params.slug)
		return { products }
	} catch (e) {
		console.error('Error loading /products:', e)
		return { products: searchService.emptyResult() }
	}
}

