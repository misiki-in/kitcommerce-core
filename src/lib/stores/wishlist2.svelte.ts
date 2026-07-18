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
      // Only read the wishlist for authenticated users. A guest has no session, so
      // /wishlists/me returns 422 on every page load (console noise fleet-wide). Gate on
      // the session cookie rather than firing an authenticated request for everyone.
      if (typeof document !== 'undefined' && document.cookie.includes('connect.sid')) {
        this.setState()
      }
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
      //console.error('While fetching wishlist', e)
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

  // 		productId: product?.id,
  // 		variantId: product?.variants?.[0]?.id
}

const WISHLIST_KEY = Symbol('WISHLIST')

export function setWishlistState() {
  return setContext(WISHLIST_KEY, new WishlistState())
}

export function getWishlistState() {
  return getContext<ReturnType<typeof setWishlistState>>(WISHLIST_KEY)
}

