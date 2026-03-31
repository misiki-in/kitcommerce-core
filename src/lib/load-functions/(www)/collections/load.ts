import { CollectionService } from '$lib/services'
import type { PageLoad } from '$lib/types/index.ts'

export const load: PageLoad = async ({ fetch, url }) => {
	const currentPage = +(url.searchParams.get('page') || 1)
	const search = url.searchParams.get('search')
	const sort = url.searchParams.get('sort')

	const collectionService = new CollectionService(fetch)
	const collections = await collectionService.list({
		page: currentPage,
		sort: sort || '-createdAt'
	})
	return collections
}

