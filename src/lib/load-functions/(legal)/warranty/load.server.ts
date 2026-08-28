import { PageService } from '$lib/services'
import type { PageServerLoad } from '$lib/types/index.js'

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const pageService = new PageService(fetch)
		const page = await pageService.getOne('warranty')
		return { page }
	} catch (error: any) {
		return { page: {}, error: error.message || 'An error occurred' }
	}
}
