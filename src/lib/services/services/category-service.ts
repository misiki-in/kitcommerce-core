import type { Category, PaginatedResponse } from './../types/index.js'

import { BaseService } from './base.service.js'

/**
 * CategoryService provides functionality for working with specific resources
 * in the Litekart API.
 *
 * This service helps with:
 * - Main functionality point 1
 * - Main functionality point 2
 * - Main functionality point 3
 */
export class CategoryService extends BaseService {
  private static instance: CategoryService

  /**
   * Get the singleton instance
   */
  /**
 * Get the singleton instance
 * 
 * @returns {CategoryService} The singleton instance of CategoryService
 */
  static getInstance(): CategoryService {
    if (!CategoryService.instance) {
      CategoryService.instance = new CategoryService()
    }
    return CategoryService.instance
  }
  /**
 * Fetches a single Category by ID
 * 
 * @param {string} id - The ID of the category to fetch
 * @returns {Promise<any>} The requested category
 * @api {get} /api/category/:id Get category by ID
 * 
 * @example
 * // Example usage
 * const category = await categoryService.fetchFooterCategories('123');
 */
  async fetchFooterCategories({ page = 1, q = '', sort = '-createdAt' }) {
    const res = await this.client.GET(`/api/categories`, {
      params: {
        query: {
          page,
          q,
          sort
        }
      }
    })

    return this.formatSDKResponse<typeof res.data>(res)
  }
  /**
 * Fetches a single Category by ID
 * 
 * @param {string} id - The ID of the category to fetch
 * @returns {Promise<any>} The requested category
 * @api {get} /api/category/:id Get category by ID
 * 
 * @example
 * // Example usage
 * const category = await categoryService.fetchFeaturedCategories('123');
 */
  async fetchFeaturedCategories({ limit = 100 }) {
    const res = await this.client.GET(`/api/categories/featured`, {
      params: {
        query: { limit }
      }
    })

    return this.formatSDKResponse<typeof res.data>(res)
  }

  /**
 * Fetches a single Category by ID
 * 
 * @param {string} id - The ID of the category to fetch
 * @returns {Promise<any>} The requested category
 * @api {get} /api/category/:id Get category by ID
 * 
 * @example
 * // Example usage
 * const category = await categoryService.fetchCategory('123');
 */

  async fetchCategory(id: string) {
    const res = await this.client.GET(`/api/product-categories`, {
      params: {
        query: { handle: id }
      }
    })

    return this.formatSDKResponse<typeof res.data>(res)
  }

  /**
 * Fetches a single Category by ID
 * 
 * @param {string} id - The ID of the category to fetch
 * @returns {Promise<any>} The requested category
 * @api {get} /api/category/:id Get category by ID
 * 
 * @example
 * // Example usage
 * const category = await categoryService.fetchAllCategories('123');
 */

  async fetchAllCategories() {
    const res = await this.client.GET(`/api/categories`)

    return this.formatSDKResponse<typeof res.data>(res)
  }

  /**
 * Fetches a single Category by ID
 * 
 * @param {string} id - The ID of the category to fetch
 * @returns {Promise<any>} The requested category
 * @api {get} /api/category/:id Get category by ID
 * 
 * @example
 * // Example usage
 * const category = await categoryService.fetchAllProductsOfCategories('123');
 */

  async fetchAllProductsOfCategories(id: string) {
    const res = await this.client.GET(`/api/product-categories`, {
      params: {
        query: { handle: id }
      }
    })

    return this.formatSDKResponse<typeof res.data>(res)
  }

  /**
 * Fetches a single Category by ID
 * 
 * @param {string} id - The ID of the category to fetch
 * @returns {Promise<any>} The requested category
 * @api {get} /api/category/:id Get category by ID
 * 
 * @example
 * // Example usage
 * const category = await categoryService.getMegamenu('123');
 */

  async getMegamenu() {
    const res = await this.client.GET(`/api/categories/megamenu`)

    return this.formatSDKResponse<typeof res.data>(res)
  }
}

// // Use singleton instance
export const categoryService = CategoryService.getInstance()
