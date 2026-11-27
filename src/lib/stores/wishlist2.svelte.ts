import { getContext, onMount, setContext, untrack } from 'svelte'
import { toast } from 'svelte-sonner'
import { wishlistService, type Product } from '$lib/services/index.js'
import { savePendingWishlistAction } from '$lib/logic/index.js'
import { getUserState } from './auth.svelte.ts'

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
    // Read the wishlist whenever a shopper becomes signed in — on load, or by any sign-in path
    // (password, phone code, sign-up) without each one having to call setState — then save the
    // heart they tapped while signed out. UserState fills `user` from the `me` cookie on mount, so
    // this also covers the reload that signed-in visitors used to get the onMount read for.
    const userState = getUserState()
    if (userState) {
      let signedInAs: string | undefined
      $effect(() => {
        const id = userState.user?.userId
        if (id === signedInAs) return
        signedInAs = id
        if (id) untrack(() => this.onSignIn())
      })
      return
    }
    onMount(() => {
      // Only read the wishlist for authenticated users. A guest has no session, so
      // /wishlists/me returns 422 on every page load (console noise fleet-wide). Gate on
      // the session cookie rather than firing an authenticated request for everyone.
      // `me`, not `connect.sid`: the session cookie is httpOnly and invisible here.
      // Anchored on a cookie boundary because a bare 'me=' also matches 'theme='.
      if (typeof document !== 'undefined' && /(^|;)\s*me=[^;]/.test(document.cookie)) {
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

  onSignIn = async () => {
    await this.setState()
    const saved = await savePendingWishlistAction(
      (productId, variantId) => Boolean(this.isWishlisted[key(productId, variantId)]),
      (productId, variantId) => this.toggleWishlistFromIds(productId, variantId)
    )
    if (saved) toast.success('Item added to wishlist')
  }

  /** Resolves to whether the item is in the wishlist once the request settles. */
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
      return next
    } catch (e) {
      // rollback if API fails
      this.isWishlisted = {
        ...this.isWishlisted,
        [k]: current
      }
      return current
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

