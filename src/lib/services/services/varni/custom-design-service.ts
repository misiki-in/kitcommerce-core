import { BaseService } from "../base.service.js";

export class VarniCustomDesignService extends BaseService {
  private static instance: VarniCustomDesignService

  static getInstance(): VarniCustomDesignService {
    if (!VarniCustomDesignService.instance) {
      VarniCustomDesignService.instance = new VarniCustomDesignService()
    }
    return VarniCustomDesignService.instance
  }

  async submitForm(formDetails: {
    name: string
    email: string
    phone: string
    jewelryType: string
    metalType: string
    designDescription: string
    budget: string
    timeline: string
    img: string
  }) {
    const res = await this.client.POST('/api/varni-custom-design', {
      body: formDetails
    })
    return this.formatSDKResponse<typeof res.data>(res)
  }
}

export const varniCustomDesignService = VarniCustomDesignService.getInstance()
