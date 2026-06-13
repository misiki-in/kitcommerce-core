import { ProductService } from '$lib/services/index.js'
import type { Product } from '$lib/types/index.js'
import type { PageLoad } from '$lib/types/index.js'
import { redirect } from '@sveltejs/kit'

function transformProductOptions(options: Product['options']) {
	return options?.map((option) => {
		const added = new Set<string>([])

		option.values = option?.values
			?.map((v) => {
				if (added.has(v.value)) {
					// Using undefined instead of null with any casting
					return undefined
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
		// Load the main product data first
		const productService = new ProductService(fetch)
		const product = await productService.getOne(slug)

    if (!product) throw 'Product not found'

		if (product.options?.length) {
			product.options = transformProductOptions(product.options)
		}

		// Return only the product data
		return {
			product: product as Product
		}
	} catch (e) {
		// locals.store.plugins.redirectToHomepageIfProductNotFound
		redirect(308, '/')
		// error(404, 'Product not found')
	}
}

