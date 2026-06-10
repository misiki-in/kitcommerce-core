import type { StoreData } from '$lib/types'
import type { PageServerLoad } from '$lib/types/index.js'
import { checkSecuredCatalogue } from '$lib/utils'

export const load: PageServerLoad = async ({ cookies, url, request, parent }) => {
	const { store } = (await parent()) as { store?: Partial<StoreData> }

	if (store?.plugins?.isSecureCatalogue?.active) {
		checkSecuredCatalogue(!!cookies.get('connect.sid'), request.headers.get('referer'), url)
	}

	try {
		const page = {} // await PageService.getOne('products')
		return { page }
	} catch (e) {
		console.error('Error loading /products:', e)
		return { page: {} }
	}
}

