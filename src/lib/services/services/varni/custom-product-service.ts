import { BaseService } from "../base.service.js";

export class VarniCustomProductService extends BaseService {
  private static instance: VarniCustomProductService

  static getInstance(): VarniCustomProductService {
    if (!VarniCustomProductService.instance) {
      VarniCustomProductService.instance = new VarniCustomProductService()
    }
    return VarniCustomProductService.instance
  }

  async checkForCombinationWith(args: {
    color: string;
    stone_quality: string;
    stone_type: string;
    finishing: string;
    size: string;
    metal_color: string;
    metal_type: string;
    style: string;
    word: string;
  }) {
    const res = await this.client.POST('/varni/check-customized-product-combinations', {
      body: args
    })
    return this.formatSDKResponse<typeof res.data>(res)
  }

  async createCustomOrderChat(productId: string) {
    const res = await this.client.POST('/custom-order-chats/create-chat', {
      body: { productId }
    })
    return this.formatSDKResponse<typeof res.data>(res)
  }

  async sendMessageToCustomOrderChat(chatId: string, vendor: string, message: string) {
    const res = await this.client.POST('/custom-order-chats', {
      body: {
        chatId,
        vendor,
        message
      }
    })
    return this.formatSDKResponse<typeof res.data>(res)
  }
}

export const varniCustomProductService = VarniCustomProductService.getInstance()
