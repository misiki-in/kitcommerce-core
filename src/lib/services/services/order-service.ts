import type { PaginatedResponse, Order } from './../types/index.js'

import { BaseService } from './base.service.js'

/**
 * OrderService provides functionality for working with specific resources
 * in the Litekart API.
 *
 * This service helps with:
 * - Main functionality point 1
 * - Main functionality point 2
 * - Main functionality point 3
 */
export class OrderService extends BaseService {
  private static instance: OrderService

  /**
   * Get the singleton instance
   */
  /**
 * Get the singleton instance
 * 
 * @returns {OrderService} The singleton instance of OrderService
 */
  static getInstance(): OrderService {
    if (!OrderService.instance) {
      OrderService.instance = new OrderService()
    }
    return OrderService.instance
  }
  /**
 * Fetches Order from the API
 * 
 * @param {Object} options - The request options
 * @param {number} [options.page=1] - The page number for pagination
 * @param {string} [options.q=''] - Search query string
 * @param {string} [options.sort='-createdAt'] - Sort order
 * @returns {Promise<any>} The requested data
 * @api {get} /api/order Get order
 * 
 * @example
 * // Example usage
 * const result = await orderService.list({ page: 1 });
 */
  async list({ page = 1, q = '', sort = '-createdAt' }) {
    const res = await this.client.GET(`/api/orders`, {
      params: {
        query: {
          page: String(page),
          q,
          sort
        }
      }
    })

    return this.formatSDKResponse<typeof res.data>(res)
  }

  /**
 * Fetches Order from the API
 * 
 * @param {Object} options - The request options
 * @param {number} [options.page=1] - The page number for pagination
 * @param {string} [options.q=''] - Search query string
 * @param {string} [options.sort='-createdAt'] - Sort order
 * @returns {Promise<any>} The requested data
 * @api {get} /api/order Get order
 * 
 * @example
 * // Example usage
 * const result = await orderService.listOrdersByParent({ page: 1 });
 */

  async listOrdersByParent({
    orderNo,
    cartId
  }: {
    orderNo: string | null
    cartId: string | null
  }) {
    const res = await this.client.GET(`/api/orders/list-by-parent`, {
      params: {
        query: {
          order_no: orderNo as any,
          cart_id: cartId as any
        }
      }
    })

    return this.formatSDKResponse<typeof res.data>(res)
  }

  /**
 * Fetches a single Order by ID
 * 
 * @param {string} id - The ID of the order to fetch
 * @returns {Promise<any>} The requested order
 * @api {get} /api/orders/:id Get order by ID
 * 
 * @example
 * // Example usage
 * const order = await orderService.fetchOrder('123');
 */

  async fetchOrder(id: string) {
    const res = await this.client.GET(`/api/orders/{id}`, {
      params: {
        path: { id }
      }
    })

    return this.formatSDKResponse<typeof res.data>(res)
  }

  /**
 * Fetches a single Order by ID
 * 
 * @param {string} id - The ID of the order to fetch
 * @returns {Promise<any>} The requested order
 * @api {get} /api/orders/:id Get order by ID
 * 
 * @example
 * // Example usage
 * const order = await orderService.getOrder('123');
 */

  async getOrder(orderNo: string) {
    const res = await this.client.GET(`/api/orders/{id}`, {
      params: {
        path: { id: orderNo }
      }
    })

    return this.formatSDKResponse<typeof res.data>(res)
  }

  /**
 * Fetches a single Order by ID
 * 
 * @param {string} id - The ID of the order to fetch
 * @returns {Promise<any>} The requested order
 * @api {get} /api/orders/:id Get order by ID
 * 
 * @example
 * // Example usage
 * const order = await orderService.fetchTrackOrder('123');
 */

  async fetchTrackOrder(id: string, page = 1) {
    const res = await this.client.GET(`/api/orders/list-by-parent`, {
      params: {
        query: {
          page: String(page),
          order_no: id,
        }
      }
    })

    return this.formatSDKResponse<typeof res.data>(res)
  }

  async paySuccessPageHit(orderId: string) {
    const res = await this.client.GET(`/api/orders/{id}`, {
      params: {
        path: { id: orderId }
      }
    })

    return this.formatSDKResponse<typeof res.data>(res)
  }

  /*
  async codCheckout({
    address,
    cartId,
    origin,
    paymentMethod,
    paymentProviderId,
    prescription
  }: any) {
    const res = await this.client.POST(`/api/carts/{id}/payment-sessions`, {
      params: {
        path: { id: cartId }
      },
      body: {
        provider_id: paymentProviderId
      }
    })

    return this.formatSDKResponse<typeof res.data>(res)
  }
  */

  async cashfreeCheckout({
    address,
    paymentMethod,
    prescription,
    origin
  }: any) {
    const res = await this.client.GET('/api/orders/me')

    return this.formatSDKResponse<typeof res.data>(res)
  }

  async razorpayCheckout({
    address,
    paymentMethod,
    prescription,
    origin
  }: any) {
    const res = await this.client.GET('/api/orders/me')

    return this.formatSDKResponse<typeof res.data>(res)
  }

  async stripeCheckout({ address, paymentMethod, prescription, origin }: any) {
    const res = await this.client.GET('/api/orders/me')

    return this.formatSDKResponse<typeof res.data>(res)
  }

  async razorCapture({ rpPaymentId, rpOrderId, origin }: any) {
    const res = await this.client.GET('/api/orders/me')

    return this.formatSDKResponse<typeof res.data>(res)
  }

  /**
 * Fetches Order from the API
 * 
 * @param {Object} options - The request options
 * @param {number} [options.page=1] - The page number for pagination
 * @param {string} [options.q=''] - Search query string
 * @param {string} [options.sort='-createdAt'] - Sort order
 * @returns {Promise<any>} The requested data
 * @api {get} /api/order Get order
 * 
 * @example
 * // Example usage
 * const result = await orderService.listPublic({ page: 1 });
 */

  async listPublic() {
    const res = await this.client.GET('/api/orders/public/list')

    return this.formatSDKResponse<typeof res.data>(res)
  }

  /**
 * Fetches a single Order by ID
 * 
 * @param {string} id - The ID of the order to fetch
 * @returns {Promise<any>} The requested order
 * @api {get} /api/orders/:id Get order by ID
 * 
 * @example
 * // Example usage
 * const order = await orderService.getOrderByEmailAndOTP('123');
 */

  async getOrderByEmailAndOTP({ email, otp }: { email: string; otp: string }) {
    const res = await this.client.GET(`/api/orders-public/list`, {
      params: {
        query: {
          otp,
          email,
          sort: '-createdAt'
        }
      }
    })

    return this.formatSDKResponse<typeof res.data>(res)
  }

  async buyAgain() {
    const res = await this.client.GET('/api/orders/buy-again')

    return this.formatSDKResponse<typeof res.data>(res)
  }

  async submitReview({ rating, review, productId, variantId, uploadedImages }: any) {
    const res = await this.client.POST(`/api/products/ratings-and-reviews`, {
      body: {
        rating,
        review,
        productId,
        variantId,
        uploadedImages
      }
    })

    return this.formatSDKResponse<typeof res.data>(res)
	}
}

// Use singleton instance
export const orderService = OrderService.getInstance()
