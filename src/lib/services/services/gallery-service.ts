import type { Gallery, PaginatedResponse } from './../types/index.js'

import { BaseService } from './base.service.js'

/**
 * GalleryService provides functionality for working with specific resources
 * in the Litekart API.
 *
 * This service helps with:
 * - Main functionality point 1
 * - Main functionality point 2
 * - Main functionality point 3
 */
export class GalleryService extends BaseService {
  private static instance: GalleryService

  /**
   * Get the singleton instance
   */
  /**
 * Get the singleton instance
 * 
 * @returns {GalleryService} The singleton instance of GalleryService
 */
  static getInstance(): GalleryService {
    if (!GalleryService.instance) {
      GalleryService.instance = new GalleryService()
    }
    return GalleryService.instance
  }
  /**
 * Fetches a single Gallery by ID
 * 
 * @param {string} id - The ID of the gallery to fetch
 * @returns {Promise<any>} The requested gallery
 * @api {get} /api/gallery/:id Get gallery by ID
 * 
 * @example
 * // Example usage
 * const gallery = await galleryService.fetchGallery('123');
 */
  async fetchGallery() {
    const res = await this.client.GET(`/api/gallery`)

    return this.formatSDKResponse<typeof res.data>(res)
  }
}

// // Use singleton instance
export const galleryService = GalleryService.getInstance()
