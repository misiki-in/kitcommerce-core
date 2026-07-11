import { BlogService } from "$lib/services/index.js";
import type { PageLoad } from "$lib/types/load-functions.js";
import { redirect as coreRedirect } from "@sveltejs/kit";

export function getLoadWithContext(redirect: typeof coreRedirect): PageLoad {
  return async ({ fetch, url }) => {
    try {
      const page = url.searchParams.get('page')
      const sort = url.searchParams.get('sort')

      const blogService = new BlogService(fetch)
      const response = await blogService.list({
        page: Number(page) || 1,
        sort: sort || undefined,
      })
      return {
        blogs: response,
      }
    } catch (e: any) {
      return {
        blogs: [],
      }
    }
  }
}
