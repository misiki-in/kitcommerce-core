import { CollectionService } from '$lib/services'
import type { Collection } from '$lib/types'
import type { PageLoad } from '$lib/types/index.js'
import { error } from '@sveltejs/kit'

type CollectionOption = {
	id: string
	values?: Array<{ id: string; value: string }>
	[key: string]: any
}

type CollectionWithOptions = Collection & {
	options?: CollectionOption[]
}

function transformCollectionOptions(options: CollectionOption[] | undefined) {
	return options?.map((option) => {
		const added = new Set<string>([])

		option.values = option?.values
			?.map((v) => {
				if (added.has(v.value)) {
					return undefined
				}

				added.add(v.value)
				return v
			})
			?.filter((v): v is NonNullable<typeof v> => Boolean(v))

		return option
	})
}

export const load: PageLoad = async ({ fetch, params }) => {
	const slug = params.slug
	try {
		const collectionService = new CollectionService(fetch)
		const collection = (await collectionService.getOne(slug)) as unknown as CollectionWithOptions

		if (collection.options?.length) {
			collection.options = transformCollectionOptions(collection.options)
		}

		let brandratings = (await collectionService.getAllRatings()) as unknown as { data?: unknown[] }
		let allratings = brandratings.data
		return {
			collection: collection as Collection,
			allratings
		}
	} catch (e) {
		error(404, 'Collection not found')
	}
}

