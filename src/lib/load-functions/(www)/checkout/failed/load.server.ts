import type { PageServerLoad } from "$lib/types/index.js"

export const load: PageServerLoad = async ({ url }) => {
	const cartId = url.searchParams.get('cart_id')
	return {
		cartId
	}
}
