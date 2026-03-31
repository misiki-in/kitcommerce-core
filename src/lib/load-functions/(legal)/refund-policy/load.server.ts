import { PageService } from '$lib/services'
import type { PageServerLoad } from '$lib/types/index.js'

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const pageService = new PageService(fetch)
		const page = await pageService.getOne('refund-policy')
		return { page }
	} catch (error: any) {
		console.error('Error fetching page: refund-policy', error)
		return { page: {}, error: error.message || 'An error occurred' }
	}
}

