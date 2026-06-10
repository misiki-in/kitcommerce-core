<script lang="ts">
	import { getCartState } from '$lib/stores'
	import { page } from '$app/state'
	import { goto } from '$app/navigation'
	import type { Snippet } from 'svelte'
	import type { Product } from '$lib/types'
	import { toast } from 'svelte-sonner'
	import { getProductKey, getUserState, getWishlistState } from '$lib/stores/index.js'
	import { showAuthModal } from '$lib/components/index.js';

	const cartState = getCartState()
  const userState = getUserState()
  const wishlistState = getWishlistState()

	interface Props {
		aspectRatio: string
		product: Product
		content: Snippet<[SnippetParams]>
	}

	let { content, product, aspectRatio }: Props = $props()

	interface SnippetParams {
		loadingForCart: boolean
		loadingForWishlist: boolean
		aspectHeight: number
		aspectWidth: number
		isWishlisted: boolean
		toggleWishlist: () => void
		handleCardClick: () => void
		changeQuantity: (product: Product, factor: 1 | -1) => Promise<void>
		addToCart: (product: Product) => Promise<void>
	}

	let loadingForWishlist = $state(false)
	let loadingForCart = $state(false)
	const aspectHeight = $derived((aspectRatio || page?.data?.store?.productImageAspectRatio)?.split(':')?.[1] || 1)
	const aspectWidth = $derived((aspectRatio || page?.data?.store?.productImageAspectRatio)?.split(':')?.[0] || 1)

	function handleCardClick() {
		goto(`/products/${product.slug}?variant_id=${product?.variants?.[0]?.id || ''}`)
	}

	async function toggleWishlist() {
    console.log("new")
	  loadingForWishlist = true
		try {
		  if (!userState?.user?.userId) {
        showAuthModal("login")
		  	toast.error('Please login to add to wishlist', { position: 'top-right' })
		  	return
		  }

		  if (userState?.user?.role !== 'USER') {
		  	toast.error('Only users can add to wishlist', { position: 'top-right' })
		  	return
		  }

			await wishlistState.toggleWishlist(product)
		} catch (error: any) {
			console.error(error)
		} finally {
			loadingForWishlist = false
		}
	}

	async function changeQuantity(product: Product, factor: 1 | -1) {
		try {
			const variantId = product.variants?.[0]?.id
			if (!variantId) return
			loadingForCart = true
			await cartState.addOrUpdate({
				qty: factor,
				productId: product.id,
				variantId
			})
		} catch (e: any) {
			toast.error(e?.message || 'Cart update failed')
		} finally {
			loadingForCart = false
		}
	}

	async function addToCart(product: Product): Promise<void> {
		try {
			const variantId = product.variants?.[0]?.id
			if (!variantId) return
			loadingForCart = true
			await cartState.addOrUpdate({
				qty: 1,
				productId: product.id,
				variantId
			})
			// toast.success('Item added to cart')
		} catch (e: any) {
			// toast.error(e?.message || 'Cart update failed')
		} finally {
			loadingForCart = false
		}
	}
</script>

{@render content({
	loadingForCart,
	loadingForWishlist: loadingForWishlist || wishlistState.loading,
	aspectHeight,
	aspectWidth,
	isWishlisted: wishlistState.isWishlisted[getProductKey(product)],
	changeQuantity,
	addToCart,
	handleCardClick,
	toggleWishlist
})}
