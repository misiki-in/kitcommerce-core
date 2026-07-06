import { wishlistService } from '$lib/services/index.js'


export const checkPendingWishlistActions = async (userId: string) => {
	const pendingProductId = localStorage.getItem('pendingWishlistProductId')
	const pendingVariantId = localStorage.getItem('pendingWishlistVariantId')

	if (pendingProductId && pendingVariantId && userId) {
		const res = await wishlistService.toggleWishlist({
			productId: pendingProductId,
			variantId: pendingVariantId
		})

		// Clear the pending items
		localStorage.removeItem('pendingWishlistProductId')
		localStorage.removeItem('pendingWishlistVariantId')

		if (res?.id) return res?.active
	}
}


export const addPendingWishlistAction = ({ productId, variantId }: { productId: string; variantId: string }) => {
	localStorage.setItem('pendingWishlistProductId', productId)
	localStorage.setItem('pendingWishlistVariantId', variantId)
}

