import type { Address, Cart } from './../types/index.js'
const REGION_ID = ''

import { BaseService } from './base.service.js'

/**
 * CartService provides functionality for managing shopping carts
 * in the Litekart platform.
 *
 * This service helps with:
 * - Retrieving cart data and contents
 * - Adding, updating, and removing items from the cart
 * - Managing cart operations such as checkout preparation
 */
export class CartService extends BaseService {
  private static instance: CartService

  /**
   * Get the singleton instance
   *
   * @returns {CartService} The singleton instance of CartService
   */
  static getInstance(): CartService {
    if (!CartService.instance) {
      CartService.instance = new CartService()
    }
    return CartService.instance
  }

  /**
   * Fetches the current user's cart data
   *
   * @returns {Promise<Cart>} The cart data
   * @api {get} /api/cart Get current cart
   *
   * @example
   * // Fetch current cart data
   * const cart = await cartService.fetchCartData();
   */
  /*async fetchCartData() {
    const res = await this.client.GET(`/api/cart`)
    return this.formatSDKResponse<typeof res.data>(res)
  }*/

  /**
   * Refreshes the cart data from the server
   *
   * @returns {Promise<Cart>} The refreshed cart data
   * @api {get} /api/carts/refresh/:cartId Refresh cart
   *
   * @example
   * // Refresh the current cart
   * const refreshedCart = await cartService.refereshCart();
   */
  async refereshCart() {
    const cartId = localStorage.getItem('cart_id') || null
    const res = await this.client.GET(`/api/carts/refresh/{id}`, {
      params: {
        path: { id: cartId as string }
      }
    })
    return this.formatSDKResponse<typeof res.data>(res)
  }

  /**
   * Fetches a cart by its ID
   *
   * @param {string} cartId - The ID of the cart to fetch
   * @returns {Promise<Cart>} The requested cart
   * @api {get} /api/carts/:id Get cart by ID
   *
   * @example
   * // Get a specific cart by ID
   * const cart = await cartService.getCartByCartId('123');
   */
  async getCartByCartId(cartId: string) {
    const res = await this.client.GET(`/api/carts/{id}`, {
      params: {
        path: { id: cartId }
      }
    })
    return this.formatSDKResponse<typeof res.data>(res)
  }

  /**
   * Adds a product to the cart or updates its quantity
   *
   * @param {object} params - The product details to add to cart
   * @param {string} params.productId - The ID of the product to add
   * @param {string} params.variantId - The variant ID of the product
   * @param {number} params.qty - The quantity to add (or -9999999 to remove)
   * @param {string|null} [params.cartId] - Optional cart ID, will use from localStorage if not provided
   * @param {string|null} params.lineId - Line item ID if updating an existing item
   * @returns {Promise<Cart>} The updated cart
   * @api {post} /api/carts/:cartId/line-items Add item to cart
   *
   * @example
   * // Add a product to cart
   * const updatedCart = await cartService.addToCart({
   *   productId: '123',
   *   variantId: '456',
   *   qty: 1,
   *   lineId: null
   * });
   */
  async addToCart({
    productId,
    variantId,
    qty,
    cartId,
    lineId
  }: {
    productId: string
    variantId: string
    qty: number
    cartId?: string | null
    lineId: string | null
  }) {
    if (cartId === undefined || cartId === 'undefined') {
      cartId = localStorage.getItem('cart_id') || null
    }
    const body = { productId, variantId, qty }

    if (!cartId) {
      const res = await this.client.POST('/api/carts', {
        body: {
          cartId,
          productId,
          variantId,
          qty
        }
      })
      const cartRes = this.formatSDKResponse<typeof res.data>(res)
      if (!cartRes?.id) throw 'Failed to create cart'

      // console.log(cartRes)
      cartId = cartRes?.id
    }
    localStorage.setItem('cart_id', cartId)
    let res: any = {}
    if (body.qty === -9999999) {
      const deleteRes = await this.client.DELETE(
        `/api/carts/{cartId}/line-items/{lineItemId}`,
        {
          params: {
            path: { cartId: cartId, lineItemId: lineId }
          }
        }
      )
      res = this.formatSDKResponse<any>(deleteRes)
    } else {
      if (lineId) {
        // Route changed as POST /api/carts/{id}/line-items/{lineId} not found
        const postRes = await this.client.POST(
          `/api/carts/{id}/line-items`,
          {
            params: {
              path: { id: cartId }
            },
            body
          }
        )
        res = this.formatSDKResponse<any>(postRes)
      } else {
        const postRes = await this.client.POST(`/api/carts/{id}/line-items`, {
          params: {
            path: { id: cartId },
          },
          body
        })
        res = this.formatSDKResponse<any>(postRes)
      }
      cartId = res?.cartId || res?.id
    }
    if (cartId) {
      const getRes = await this.client.GET(`/api/carts/{id}`, {
        params: {
          path: { id: cartId as string }
        }
      })
      res = this.formatSDKResponse<any>(getRes)
      // await postKitcommerceApi(`carts/${cartId}`, { customer_id: res?.id })

      localStorage.setItem('cart_id', cartId)
    }
    return res
    // return this.post<Cart>(`/api/carts`, { cartId, productId, variantId, qty })
  }

  async removeCart({
    cartId,
    lineId = null
  }: {
    cartId: string
    lineId: string | null
  }) {
    // console.log('🚀 ~ addToCartService= ~ productId variantId qty lineId:', lineId)
    if (cartId === undefined || cartId === 'undefined') {
      cartId = localStorage.getItem('cart_id') || ''
    }

    if (!cartId) {
      const postRes = await this.client.POST('/api/carts', {
        body: {
          region_id: REGION_ID
        }
      })
      const cartRes = this.formatSDKResponse<any>(postRes)
      cartId = cartRes?.id
    }
    localStorage.setItem('cart_id', cartId)

    if (lineId) {
      const deleteRes = await this.client.DELETE(
        `/api/carts/{cartId}/line-items/{lineItemId}`,
        {
          params: {
            path: { cartId, lineItemId: lineId }
          }
        }
      )
      if (!cartId)
        return this.formatSDKResponse<typeof deleteRes.data>(deleteRes)
    }

    if (cartId) {
      const postRes = await this.client.GET(`/api/carts/{id}`, {
        params: {
          path: { id: cartId as string }
        },
      })
      return this.formatSDKResponse<typeof postRes.data>(postRes)
    }

    return {}
  }

  async applyCoupon({
    cartId,
    couponCode
  }: {
    cartId: string
    couponCode: string
  }) {
    const res = await this.client.POST(`/api/cart/apply-coupon/{id}`, {
      params: {
        path: { id: cartId }
      },
      body: {
        couponCode
      }
    })
    return this.formatSDKResponse<typeof res.data>(res)
  }

  async removeCoupon() {
    const cartId = localStorage.getItem('cart_id') || null
    const res = await this.client.POST(`/api/cart/remove-coupon/{id}`, {
      params: {
        path: { id: cartId as string }
      },
    })
    return this.formatSDKResponse<typeof res.data>(res)
  }

  async updateCart2({
    storeId,
    cartId,
    email,
    billingAddress,
    customer_id,
    shippingAddress,
    phone,
    isBillingAddressSameAsShipping
  }: any) {
    if (!cartId || cartId === undefined || cartId === 'undefined') {
      cartId = localStorage.getItem('cart_id') || null
    }

    const body: any = {
      customer_id
    }
    if (email) {
      body.email = email
    }
    if (phone) {
      body.phone = phone
    }
    let address_data
    if (shippingAddress) {
      body.shipping_address = {
        id: shippingAddress?.id,
        firstName: shippingAddress?.firstName,
        lastName: shippingAddress?.lastName,
        address_1: shippingAddress?.address_1,
        address_2: shippingAddress?.address_2,
        city: shippingAddress?.city,
        landmark: shippingAddress?.landmark,
        zip: shippingAddress?.zip,
        state: shippingAddress?.state,
        countryCode: shippingAddress?.countryCode || 'IN',
        phone: shippingAddress?.phone,
        email: shippingAddress?.email
      }
      const postRes = await this.client.POST('/api/address', {
        body: body.shipping_address
      })
      address_data = this.formatSDKResponse<typeof postRes.data>(postRes)
      delete body.shipping_address
      body.shippingAddressId = address_data?.id
    }
    if (billingAddress && !isBillingAddressSameAsShipping) {
      body.billing_address = {
        id:
          shippingAddress?.id === billingAddress?.id
            ? 'new'
            : shippingAddress
              ? billingAddress?.id
              : 'new',
        firstName: billingAddress?.firstName,
        lastName: billingAddress?.lastName,
        address_1: billingAddress?.address_1,
        address_2: billingAddress?.address_2,
        city: billingAddress?.city,
        landmark: billingAddress?.landmark,
        zip: billingAddress?.zip,
        state: billingAddress?.state,
        countryCode: billingAddress?.countryCode || 'IN',
        phone: billingAddress?.phone,
        email: billingAddress?.email
      }
      const postRes = await this.client.POST('/api/address', {
        body: body.billing_address
      })
      address_data = this.formatSDKResponse<typeof postRes.data>(postRes)
      delete body.billing_address
      // console.log('🚀 ~ CartService ~ updateCart2 ~ address_data:', address_data)
      body.billingAddressId = address_data?.id
    } else if (shippingAddress && isBillingAddressSameAsShipping) {
      body.billingAddressId = body.shippingAddressId
    }

    if (cartId) {
      const patchRes = await this.client.PATCH(`/api/carts/{id}`, {
        params: {
          path: { id: cartId as string }
        },
        body
      })
      const res = this.formatSDKResponse<typeof patchRes.data>(patchRes)

        // Use type assertion to avoid TypeScript error
        ; (res as any).shipping_address = address_data

      return res || {}
    }
  }

  /*async completeCart(cart_id: string) {
    const res = await this.client.POST(`/api/carts/{id}/complete`, {
      params: {
        path: { id: cart_id }
      },
      body: {
        id: cart_id
      }
    })
    return this.formatSDKResponse<typeof res.data>(res)
  }*/

  async updateCart({
    qty,
    cartId,
    lineId = null,
    productId,
    variantId,
    isSelectedForCheckout
  }: any) {
    // console.log('🚀 ~ addToCartService= ~ productId variantId qty lineId:', qty, lineId, productId, variantId)
    if (!cartId || cartId === undefined || cartId === 'undefined') {
      cartId = localStorage.getItem('cart_id') || null
    }

    if (!cartId) {
      const postRes = await this.client.POST('/api/carts', {
        body: {
          region_id: REGION_ID
        }
      })
      const cartRes = this.formatSDKResponse<typeof postRes.data>(postRes)
      cartId = cartRes?.id
    }
    localStorage.setItem('cart_id', cartId)

    if (lineId) {
      const postRes = await this.client.POST(`/api/carts/{id}/line-items`, {
        params: {
          path: { id: cartId as string }
        },
        body: {
          qty: qty,
          id: lineId,
          productId,
          variantId,
          isSelectedForCheckout
        }
      })
      return this.formatSDKResponse<typeof postRes.data>(postRes)
    }
    // console.log(res)
    // if (cartId) {
    // 	await postKitcommerceApi(`carts/${cartId}`, { customer_id: res?.id })
    // }

    return {}
    // return this.post<Cart>(`/api/carts/${cartId}/line-items`, { qty: qty, id: lineId, productId, variantId })
  }

  async updateShippingRate({
    cartId,
    shippingRateId
  }: {
    cartId: string
    shippingRateId: string
  }) {
    const updates = { shippingRateId }
    const res = await this.client.PATCH(`/api/carts/{id}`, {
      params: {
        path: { id: cartId }
      },
      body: updates
    })
    return this.formatSDKResponse<typeof res.data>(res)
  }
}

// // Use singleton instance
export const cartService = CartService.getInstance()
