import { PageService } from '$lib/services/index.js'
import type { PageServerLoad } from '$lib/types/load-functions.js'

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const pageService = new PageService(fetch)
		const page = await pageService.getOne('privacy-policy')
		return { page }
	} catch (error: any) {
		console.error('Error fetching page: privacy-policy', error)
		return { page: {}, error: error.message || 'An error occurred' }
	}
}

