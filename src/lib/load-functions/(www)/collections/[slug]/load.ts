import { CollectionService } from '$lib/services'
import type { Collection } from '$lib/types'
import type { PageLoad } from '$lib/types/index.ts'
import { error } from '@sveltejs/kit'

function transformCollectionOptions(options: Collection['options']) {
	return options?.map((option) => {
		const added = new Set<string>([])

		option.values = option?.values
			?.map((v) => {
				if (added.has(v.value)) {
					return null as any
				}

				added.add(v.value)
				return v
			})
			?.filter((v) => v)

		return option
	})
}

export const load: PageLoad = async ({ fetch, params }) => {
	const slug = params.slug
	try {
		const collectionService = new CollectionService(fetch)
		const collection = await collectionService.getOne(slug)

		if (collection.options?.length) {
			collection.options = transformCollectionOptions(collection.options)
		}

		let brandratings = await collectionService.getAllRatings()
		let allratings = brandratings.data
		return {
			collection: collection as Collection,
			allratings
		}
	} catch (e) {
		error(404, 'Collection not found')
	}
}

