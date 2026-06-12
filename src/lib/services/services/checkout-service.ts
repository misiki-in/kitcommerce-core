import type { Cart, Checkout } from './../types/index.js'

import { BaseService } from './base.service.js'

/**
 * CheckoutService provides functionality for managing checkout processes
 * in the Litekart platform.
 *
 * This service helps with:
 * - Processing payments through various payment gateways
 * - Managing checkout flows for different payment methods
 * - Handling shipping rates and order completion
 */
export class CheckoutService extends BaseService {
  private static instance: CheckoutService

  /**
   * Get the singleton instance
   *
   * @returns {CheckoutService} The singleton instance of CheckoutService
   */
  static getInstance(): CheckoutService {
    if (!CheckoutService.instance) {
      CheckoutService.instance = new CheckoutService()
    }
    return CheckoutService.instance
  }

  /**
   * Initiates Razorpay checkout process
   *
   * @param {Object} params - Parameters for Razorpay checkout
   * @param {string} params.cartId - The cart ID for checkout
   * @param {string} params.origin - The origin URL for callbacks
   * @returns {Promise<Cart>} The cart with Razorpay payment information
   * @api {post} /api/checkout/razorpay Razorpay checkout
   *
   * @example
   * // Start Razorpay checkout
   * const checkoutData = await checkoutService.checkoutRazorpay({
   *   cartId: '123',
   *   origin: 'https://example.com'
   * });
   */
  async checkoutRazorpay({
    cartId,
    origin
  }: {
    cartId: string
    origin: string
  }) {
    const res = await this.client.POST('/api/checkout/razorpay', {
      body: {
        cartId,
        origin
      }
    })
    return this.formatSDKResponse<typeof res.data>(res)
  }

  /**
   * Initiates Cash on Delivery checkout process
   *
   * @param {Object} params - Parameters for COD checkout
   * @param {string} params.cartId - The cart ID for checkout
   * @param {string} params.origin - The origin URL for callbacks
   * @returns {Promise<Cart>} The cart with COD payment information
   * @api {post} /api/checkout/cod COD checkout
   *
   * @example
   * // Start COD checkout
   * const checkoutData = await checkoutService.checkoutCOD({
   *   cartId: '123',
   *   origin: 'https://example.com'
   * });
   */
  async checkoutCOD({ cartId, origin }: { cartId: string; origin: string }) {
    const res = await this.client.POST('/api/checkout/cod', {
      body: { cartId, origin }
    })
    return this.formatSDKResponse<typeof res.data>(res)
  }

  /**
   * Initiates Point of Sale checkout process
   *
   * @param {Object} params - Parameters for POS checkout
   * @param {string} params.cartId - The cart ID for checkout
   * @param {string} params.origin - The origin URL for callbacks
   * @returns {Promise<Cart>} The cart with POS payment information
   * @api {post} /api/checkout/pos POS checkout
   *
   * @example
   * // Start POS checkout
   * const checkoutData = await checkoutService.checkoutPOS({
   *   cartId: '123',
   *   origin: 'https://example.com'
   * });
   */
  async checkoutPOS({ cartId, origin }: { cartId: string; origin: string }) {
    const res = await this.client.POST('/api/checkout/pos', {
      body: { cartId, origin }
    })
    return this.formatSDKResponse<typeof res.data>(res)
  }

  /**
   * Captures a Razorpay payment after authorization
   *
   * @param {Object} params - Parameters for capturing Razorpay payment
   * @param {string} params.razorpay_order_id - Razorpay order ID
   * @param {string} params.razorpay_payment_id - Razorpay payment ID
   * @returns {Promise<any>} The capture response
   * @api {post} /api/checkout/razorpay-capture Capture Razorpay payment
   *
   * @example
   * // Capture Razorpay payment
   * const captureResponse = await checkoutService.captureRazorpayPayment({
   *   razorpay_order_id: 'order_123',
   *   razorpay_payment_id: 'pay_456'
   * });
   */
  async captureRazorpayPayment({
    razorpay_order_id,
    razorpay_payment_id
  }: {
    razorpay_order_id: string
    razorpay_payment_id: string
  }) {
    const res = await this.client.POST('/api/checkout/razorpay-capture', {
      body: {
        razorpay_order_id,
        razorpay_payment_id
      }
    })
    return this.formatSDKResponse<typeof res.data>(res)
  }

  /**
   * Initiates PhonePe checkout process
   *
   * @param {Object} params - Parameters for PhonePe checkout
   * @param {string} params.cartId - The cart ID for checkout
   * @param {string} params.email - Customer email
   * @param {string} params.phone - Customer phone number
   * @param {string} params.origin - The origin URL for callbacks
   * @returns {Promise<any>} The PhonePe checkout response
   * @api {post} /api/checkout/phonepe PhonePe checkout
   *
   * @example
   * // Start PhonePe checkout
   * const checkoutData = await checkoutService.checkoutPhonepe({
   *   cartId: '123',
   *   email: 'customer@example.com',
   *   phone: '9876543210',
   *   origin: 'https://example.com'
   * });
   */
  async checkoutPhonepe({
    cartId,
    email,
    phone,
    origin
  }: {
    cartId: string
    email: string
    phone: string
    origin: string
  }) {
    const res = await this.client.POST('/api/checkout/phonepe', {
      body: { cartId, email, phone, origin }
    })
    return this.formatSDKResponse<typeof res.data>(res)
  }

  /**
   * Retrieves shipping rates for a cart
   *
   * @param {Object} params - Parameters for getting shipping rates
   * @param {string} params.cartId - The cart ID to get shipping rates for
   * @returns {Promise<Checkout>} The shipping rates information
   * @api {get} /api/shipping-rates/:cartId Get shipping rates
   *
   * @example
   * // Get shipping rates for a cart
   * const shippingRates = await checkoutService.getShippingRates({
   *   cartId: '123'
   * });
   */
  async getShippingRates({ cartId }: { cartId: string }) {
    const res = await this.client.GET(`/api/shipping-rates/{cartId}`, {
      params: {
        path: { cartId }
      }
    })
    return this.formatSDKResponse<typeof res.data>(res)
  }

  async capturePhonepePayment({
    phonepe_order_id,
    phonepe_payment_id
  }: {
    phonepe_order_id: string
    phonepe_payment_id: string
  }) {
    const res = await this.client.POST('/api/checkout/phonepe-capture', {
      body: {
        phonepe_order_id,
        phonepe_payment_id
      }
    })
    return this.formatSDKResponse<typeof res.data>(res)
  }
  async checkoutPaypal({
    cartId,
    origin,
    return_url
  }: {
    cartId: string
    origin: string
    return_url: string
  }) {
    const res = await this.client.POST('/api/checkout/paypal', {
      body: {
        cartId,
        origin,
        return_url
      }
    })
    return this.formatSDKResponse<typeof res.data>(res)
  }
  async checkoutStripe({ cartId, origin }: { cartId: string; origin: string }) {
    const res = await this.client.POST('/api/checkout/stripe', {
      body: { cartId, origin }
    })
    return this.formatSDKResponse<typeof res.data>(res)
  }
  async checkoutStripeCapture({
    order_no,
    pg,
    payment_session_id,
    storeId
  }: {
    order_no: string
    pg: string
    payment_session_id: string
    storeId: string
  }) {
    const res = await this.client.POST('/api/checkout/stripe-capture', {
      body: {
        order_no,
        pg,
        payment_session_id,
        storeId
      }
    })
    return this.formatSDKResponse<typeof res.data>(res)
  }

  async createAffirmPayOrder({
    cartId,
    addressId,
    origin,
    storeId,
    paymentMethodId
  }: {
    cartId: string
    addressId: string
    origin: string
    storeId: string
    paymentMethodId: string
  }) {
    const res = await this.client.POST('/api/affirm-checkout/create-order', {
      body: {
        cartId,
        addressId,
        origin,
        storeId,
        paymentMethodId
      }
    })
    return this.formatSDKResponse<typeof res.data>(res)
  }

  async cancelAffirmOrder({
    orderId,
    storeId,
    origin
  }: {
    orderId: string
    storeId: string
    origin: string
  }) {
    const res = await this.client.POST('/api/checkout/affirm/cancel-order', {
      body: {
        orderId,
        storeId,
        origin
      }
    })
    return this.formatSDKResponse<typeof res.data>(res)
  }

  async confirmAffirmOrder({
    affirmToken,
    orderId,
    storeId,
    origin
  }: {
    affirmToken: string
    orderId: string
    storeId: string
    origin: string
  }) {
    const res = await this.client.POST('/api/checkout/affirm/confirm-order', {
      body: {
        affirmToken,
        orderId,
        storeId,
        origin
      }
    })
    return this.formatSDKResponse<typeof res.data>(res)
  }
}

// // Use singleton instance
export const checkoutService = CheckoutService.getInstance()
