import { PageService } from '$lib/services'
import type { PageServerLoad } from '$lib/types/index.js'

export const load: PageServerLoad = async ({ parent, fetch }) => {
	try {
		const pageService = new PageService(fetch)
		const page = await pageService.getOne('contact-us')
		return { page }
	} catch (error: any) {
		console.error('Error fetching page: contact-us', error)
		return { page: {}, error: error.message || 'An error occurred' }
	}
}

