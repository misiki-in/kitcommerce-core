import type { Product, Variant } from '$lib/types'


export const storeProductToRecentlyViewed = async ({ product, variant }: { product: Product; variant: Variant }) => {
	const localRecentlyViewed = localStorage.getItem(`recently_viewed`)

	let recentlyViewed: any[] = []
	if (!!localRecentlyViewed && localRecentlyViewed !== 'undefined') {
		recentlyViewed = JSON.parse(localRecentlyViewed)
	}

	if (recentlyViewed.find((x: Record<string, any>) => x?.id === product?.id)) {
		return
	} else if (product?.thumbnail && product?.title && variant?.price) {
		const prod = {
			...product,
			hasStock: variant?.stock > 0 || product?.stock > 0,
			variants: [{ ...variant }]
		}

		if (recentlyViewed?.length > 10) {
			recentlyViewed.shift()
		}

		const resvw = [...recentlyViewed]
		resvw.push(prod)
		recentlyViewed = resvw

		localStorage.setItem(`recently_viewed`, JSON.stringify(recentlyViewed))
	}
}
