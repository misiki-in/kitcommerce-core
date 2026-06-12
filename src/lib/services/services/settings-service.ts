import type { Setting } from './../types/index.js'

import { BaseService } from './base.service.js'

/**
 * SettingService provides functionality for working with specific resources
 * in the Litekart API.
 *
 * This service helps with:
 * - Main functionality point 1
 * - Main functionality point 2
 * - Main functionality point 3
 */
export class SettingService extends BaseService {
  private static instance: SettingService

  /**
   * Get the singleton instance
   */
  /**
 * Get the singleton instance
 * 
 * @returns {SettingService} The singleton instance of SettingService
 */
  static getInstance(): SettingService {
    if (!SettingService.instance) {
      SettingService.instance = new SettingService()
    }
    return SettingService.instance
  }
  /**
 * Fetches a single Setting by ID
 * 
 * @param {string} id - The ID of the setting to fetch
 * @returns {Promise<any>} The requested setting
 * @api {get} /api/setting/:id Get setting by ID
 * 
 * @example
 * // Example usage
 * const setting = await settingService.fetchSetting('123');
 */
  async fetchSetting() {
    const res = await this.client.GET('/api/settings')
    return this.formatSDKResponse<typeof res.data>(res)
  }

  /**
 * Creates a new Setting
 * 
 * @param {any} data - The data to create
 * @returns {Promise<any>} The created setting
 * @api {post} /api/setting Create setting
 * 
 * @example
 * // Example usage
 * const newSetting = await settingService.saveSettings({ 
 *   // required fields
 * });
 */

  async saveSettings(setting: Omit<Setting, 'id'>) {
    const res = await this.client.POST('/api/settings', {
      body: setting
    })
    return this.formatSDKResponse<typeof res.data>(res)
  }

  async updateSettings(id: string, setting: Partial<Setting>) {
    const res = await this.client.PATCH('/api/settings/{id}', {
      params: {
        path: { id }
      },
      body: setting
    })
    return this.formatSDKResponse<typeof res.data>(res)
  }
}

// Use singleton instance
export const settingService = SettingService.getInstance()
