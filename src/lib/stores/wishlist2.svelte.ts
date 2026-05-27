import { getContext, onMount, setContext } from 'svelte'
import { wishlistService, type Product } from '$lib/services/index.js'

interface Query {
  productId: string
  variantId: string
}

const key = (x: string, y: string) => `${x}-${y}`

export const getProductKey = (product: Product) => key(product?.id, product?.variants?.[0]?.id)

class WishlistState {
  static instance: WishlistState | null = null

  loading = $state(false)
  count = $state(0)
  isWishlisted = $state<Record<string, boolean>>({})

  constructor() {
    onMount(() => {
      this.setState()
    })
  }

  setState = async () => {
    try {
      this.loading = true
      this.isWishlisted = {}
      this.count = 0
      // intends to fail if user is not logged in
      const res = await wishlistService.fetchWishlist({})
      this.count = res?.data?.length
      for (const { variant, product } of res?.data) this.isWishlisted[key(product?.id, variant?.id)] = true
    } catch (e: any) {
      console.error('While fetching wishlist', e)
    } finally {
      this.loading = false
    }
  }

  toggleWishlistFromIds = async (productId: string, variantId: string) => {
    const k = key(productId, variantId)

    const current = Boolean(this.isWishlisted[k])
    const next = !current

    this.isWishlisted = {
      ...this.isWishlisted,
      [k]: next
    }
    this.isWishlisted = { ...this.isWishlisted }

    try {
      await wishlistService.toggleWishlist({
        productId,
        variantId,
      })

      // update count
      if (next) this.count++
      else if (this.count) this.count--
    } catch (e) {
      // rollback if API fails
      this.isWishlisted = {
        ...this.isWishlisted,
        [k]: current
      }
    }
  }


  toggleWishlist = async (product: Product) => {
    return this.toggleWishlistFromIds(
      product?.id,
      product?.variants?.[0]?.id
    )
  }

  // toggleWishlist = async (product: Product) => {
  // 	const res = await wishlistService.toggleWishlist({
  // 		productId: product?.id,
  // 		variantId: product?.variants?.[0]?.id
  // 	})
  // 	const active = Boolean(res?.active)
  // 	this.isWishlisted[getProductKey(product)] = active
  // 	if (active) this.count++
  // 	else if (this.count) this.count--
  // 	else console.error('Wishlist count decrementing to negative integer')
  // }
}

const WISHLIST_KEY = Symbol('WISHLIST')

export function setWishlistState() {
  return setContext(WISHLIST_KEY, new WishlistState())
}

export function getWishlistState() {
  return getContext<ReturnType<typeof setWishlistState>>(WISHLIST_KEY)
}

