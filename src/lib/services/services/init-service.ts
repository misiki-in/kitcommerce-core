import type { Init } from './../types/index.js'

import { BaseService } from './base.service.js'

/**
 * InitService provides functionality for working with specific resources
 * in the Litekart API.
 *
 * This service helps with:
 * - Main functionality point 1
 * - Main functionality point 2
 * - Main functionality point 3
 */
export class InitService extends BaseService {
  private static instance: InitService

  /**
   * Get the singleton instance
   */
  /**
 * Get the singleton instance
 * 
 * @returns {InitService} The singleton instance of InitService
 */
  static getInstance(): InitService {
    if (!InitService.instance) {
      InitService.instance = new InitService()
    }
    return InitService.instance
  }
  /**
 * Fetches a single Init by ID
 * 
 * @param {string} id - The ID of the init to fetch
 * @returns {Promise<any>} The requested init
 * @api {get} /api/init/:id Get init by ID
 * 
 * @example
 * // Example usage
 * const init = await initService.fetchInit('123');
 */
  async fetchInit() {
    const res = await this.client.GET(`/api/init`)

    return this.formatSDKResponse<typeof res.data>(res)
  }
}

// Use singleton instance
export const initService = InitService.getInstance()
