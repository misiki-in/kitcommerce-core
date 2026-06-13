import { PageService } from '$lib/services/index.js'
import type { PageServerLoad } from '$lib/types/index.js'

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const pageService = new PageService(fetch)
		const page = await pageService.getOne('shipping-policy')
		return { page }
	} catch (error: any) {
		console.error('Error fetching page: shipping-policy', error)
		return { page: {}, error: error.message || 'An error occurred' }
	}
}

