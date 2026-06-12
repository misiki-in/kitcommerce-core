import type { Upload } from '../types/index.js'
import { BaseService} from './base.service.js'

export class UploadService extends BaseService {
  private static instance:UploadService 

  /**
   * Get the singleton instance
   *
   * @returns {UploadService} The singleton instance ofUploadService 
   */
  static getInstance(): UploadService {
    if (!UploadService.instance) {
      UploadService.instance = new UploadService()
    }
    return UploadService.instance
  }
   async uploadToS3({
    file,
    folderName,
    type
  }: {
    file: File
    folderName: string
    type: string
  }): Promise<Upload> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folderName)
    formData.append('type', type)
    const res = await this.client.POST(`/api/upload`, {
      body: formData as any
    })
    const data = this.formatSDKResponse<any>(res)
    return data?.url
  }

   async uploadMultipleToS3({
    files,
    folderName,
    type
  }: {
    files: File[]
    folderName: string
    type: string
  }): Promise<Upload[]> {
    // Read all files as base64
    const fileData = await Promise.all(
      files.map(async (file) => {
        return new Promise<{ name: string; type: string; data: string }>(
          (resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => {
              resolve({
                name: file.name,
                type: file.type,
                data: reader.result as string
              })
            }
            reader.readAsDataURL(file)
          }
        )
      })
    )

    const res = await this.client.POST(`/api/upload/multiple`, {
      body: {
        files: fileData,
        folder: folderName,
        type: type
      }
    })
    const data = this.formatSDKResponse<any>(res)
    return data?.urls
  }
  async deleteFromS3({ url }: { url: string }): Promise<void> {
    // console.log('url', url)
    const res = await this.client.POST(`/api/upload/delete`, {
      body: { url }
    })
    this.formatSDKResponse<any>(res)
    return
  }
}

// // Use singleton instance
export const uploadService = UploadService.getInstance()
