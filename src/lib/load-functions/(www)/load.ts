import { PageService } from '$lib/services/index.js'
import type { PageLoad } from '$lib/types/index.js'

export const load: PageLoad = async ({ fetch }) => {
	try {
		const pageService = new PageService(fetch)
		const page = await pageService.getOne('home')
		return { page }
	} catch (e) {
		console.error('Home page load', e)
		return { page: {} }
	}
	// try {
	// } catch (e) {
	// 	a
	// 	products: productsRes.data
}

