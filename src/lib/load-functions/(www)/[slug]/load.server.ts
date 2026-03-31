import { MeilisearchService } from '$lib/services'
import type { PageServerLoad, StoreData } from '$lib/types/index.js'
import { checkSecuredCatalogue } from '$lib/utils/index.js'

export const load: PageServerLoad = async ({ cookies, url, params, request, parent, fetch }) => {
	const { store }: { store: StoreData | {} } = await parent()

	if (store?.plugins?.isSecureCatalogue?.active) {
		checkSecuredCatalogue(!!cookies.get('connect.sid'), request.headers.get('referer'), url)
	}

	try {
		const { slug } = params
		const meilisearchService = new MeilisearchService(fetch)
		const res = await meilisearchService.search({
			query: url?.searchParams?.get('search') || '',
			categories: slug,
			price: url?.searchParams?.get('price') || '',
			tags: url?.searchParams?.get('tags') || '',
			originCountry: url?.searchParams?.get('originCountry') || '',
			keywords: url?.searchParams?.get('keywords') || '',
			page: Number(url?.searchParams?.get('page')) || 1
		})
		return { page: res }
	} catch (e) {
		return { page: {} }
	}
}

