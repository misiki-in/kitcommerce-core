import { BlogService } from "$lib/services/index.js";
import type { PageLoad } from "$lib/types/load-functions.js";
import { redirect as coreRedirect } from "@sveltejs/kit";

export function getLoadWithContext(redirect: typeof coreRedirect): PageLoad {
  return async ({ fetch, params }) => {
    try {
      const blogService = new BlogService(fetch)
      const response = await blogService.getOne(params.slug)
      return {
        blog: response,
      }
    } catch (e: any) {
      console.error("error in blog", e)
      redirect(307, '/blogs')
    }
  }
}
