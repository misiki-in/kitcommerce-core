import type { Page, PaginatedResponse } from './../types/index.js'

import { BaseService } from './base.service.js'

/**
 * PageService provides functionality for working with specific resources
 * in the Litekart API.
 *
 * This service helps with:
 * - Main functionality point 1
 * - Main functionality point 2
 * - Main functionality point 3
 */
export class PageService extends BaseService {
  private static instance: PageService

  /**
   * Get the singleton instance
   */
  /**
 * Get the singleton instance
 * 
 * @returns {PageService} The singleton instance of PageService
 */
  static getInstance(): PageService {
    if (!PageService.instance) {
      PageService.instance = new PageService()
    }
    return PageService.instance
  }
  /**
 * Fetches Page from the API
 * 
 * @param {Object} options - The request options
 * @param {number} [options.page=1] - The page number for pagination
 * @param {string} [options.q=''] - Search query string
 * @param {string} [options.sort='-createdAt'] - Sort order
 * @returns {Promise<any>} The requested data
 * @api {get} /api/page Get page
 * 
 * @example
 * // Example usage
 * const result = await pageService.list({ page: 1 });
 */
  async list({ page = 1, search = '', sort = '-createdAt' }) {
    const res = await this.client.GET(`/api/pages`, {
      params: {
        query: {
          page,
          search,
          sort
        }
      }
    })

    return this.formatSDKResponse<typeof res.data>(res)
  }

  /**
 * Fetches Page from the API
 * 
 * @param {Object} options - The request options
 * @param {number} [options.page=1] - The page number for pagination
 * @param {string} [options.q=''] - Search query string
 * @param {string} [options.sort='-createdAt'] - Sort order
 * @returns {Promise<any>} The requested data
 * @api {get} /api/page Get page
 * 
 * @example
 * // Example usage
 * const result = await pageService.listLatestPages({ page: 1 });
 */

  async listLatestPages({}) {
    const res = await this.client.GET(`/api/pages`, {
      params: {
        query: {
          sort: '-updatedAt',
          limit: 10
        }
      }
    })

    return this.formatSDKResponse<typeof res.data>(res)
  }

  /**
 * Fetches a single Page by ID
 * 
 * @param {string} id - The ID of the page to fetch
 * @returns {Promise<any>} The requested page
 * @api {get} /api/page/:id Get page by ID
 * 
 * @example
 * // Example usage
 * const page = await pageService.getOne('123');
 */

  async getOne(id: string) {
    const res = await this.client.GET(`/api/pages/{id}`, {
      params: {
        path: { id }
      }
    })

    return this.formatSDKResponse<typeof res.data>(res)
  }
}

// Use singleton instance
export const pageService = PageService.getInstance()
