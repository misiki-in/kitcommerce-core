import type { StoreData } from '$lib/types'
import { type PageServerLoad } from '$lib/types/index.ts'
import { PageService } from '$lib/services'
import { checkSecuredCatalogue } from '$lib/utils'

export const load: PageServerLoad = async ({ cookies, url, request, parent, fetch }) => {
	const { store }: { store: StoreData | {} } = await parent()

	if (store?.plugins?.isSecureCatalogue?.active) {
		checkSecuredCatalogue(!!cookies.get('connect.sid'), request.headers.get('referer'), url)
	}

	try {
    const pageService = new PageService(fetch)
		const page = await pageService.getOne('products')
		return { page }
	} catch (e) {
		console.error('Error loading /products:', e)
		return { page: {} }
	}
}

