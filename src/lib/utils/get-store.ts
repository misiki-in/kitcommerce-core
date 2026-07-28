import DefaultConfig from '../default-store-config.ts'

export async function getStore({ storeId, domain }: { storeId: string, domain?: string}, storeService: any) {
  const CONFIG_PATH = `${process.cwd()}/kitcommerce.config.ts`
  try {
		return await storeService.getStoreByIdOrDomain({ storeId, domain })
  } catch(fetchError: any) {
    try {
      const config = await import(CONFIG_PATH)
      console.log("Using kitcommerce.config.ts config")
      return {
        ...DefaultConfig,
        ...config.default,
      }
    } catch(importError: any) {
      throw fetchError
    }
  }
}


