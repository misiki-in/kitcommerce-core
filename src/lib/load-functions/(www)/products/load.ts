import { SearchService } from '$lib/services'
import type { PageLoad } from '$lib/types/index.ts'

export const load: PageLoad = async ({ url, fetch, data }) => {
	const searchService = new SearchService(fetch)
	try {
		const products = await searchService.searchWithUrl(url)
		return {
			...data,
			products
		}
	} catch (e) {
		console.error('Error loading /products:', e)
		return {
			...data,
			products: searchService.emptyResult()
		}
	}
}


