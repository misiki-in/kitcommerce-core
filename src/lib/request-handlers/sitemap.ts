import { StoreService } from '$lib/services/index.js'
import { error, redirect as coreRedirect, type RequestHandler } from '@sveltejs/kit'

export function redirectToSitemap(redirect: typeof coreRedirect): RequestHandler {
  return async ({ fetch, cookies, url }) => {
    const storeId = cookies.get('litekart_store_id')
    const storeService = new StoreService(fetch)
    const data = await storeService.get(`/api/stores/${storeId}`)
    if (data?.sitemap)
      redirect(302, data.sitemap)
    else
      error(404, 'Sitemap not found, you can generate sitemap through the admin dashboard.')
  }
}
