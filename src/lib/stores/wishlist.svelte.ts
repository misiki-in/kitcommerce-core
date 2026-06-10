import { wishlistService, type Product } from "$lib/services/index.js";

interface Query {
  productId: string
  variantId: string
}

const key = (x: string, y: string) =>
  `${x}-${y}`

const getVariantId = (product: Product) => product?.variants?.[0]?.id ?? ''
const getProductKey = (product: Product) => key(product.id, getVariantId(product))

class WishlistState {
  static instance: WishlistState | null = null
  private queries: Query[] = []

  loading = $state(false)
  isWishlisted = $state<Record<string, boolean>>({})

  addProductsAsQueries = (products: Product[]) => {
    const queries: Query[] = []
    for (const prod of products) {
      const variantId = getVariantId(prod)
      if (variantId) queries.push({ productId: prod.id, variantId })
    }
    this.queries = [...this.queries, ...queries]
  }

  resolveQueries = async () => {
    try {
      this.loading = true
      const res = await wishlistService.checkWishlistInBulk(this.queries)
      this.queries = []
      const tmp: Record<string, boolean> = {}
      for (const entry of res) tmp[key(entry.productId, entry.variantId)] = entry.exists
      this.isWishlisted = tmp
    } catch (e: any) {
      console.error(e)
    } finally {
      this.loading = false
    }
  }

  toggleWishlist = async (product: Product) => {
    const variantId = getVariantId(product)
    if (!variantId) return
    const res = await wishlistService.toggleWishlist({
      productId: product.id,
      variantId,
    })
    this.isWishlisted[getProductKey(product)] = Boolean(res?.active)
  }
}

export const wishlistState = new WishlistState()
