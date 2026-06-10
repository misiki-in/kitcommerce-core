import { redirect as coreRedirect } from '@sveltejs/kit';
import type { PageServerLoad } from '$lib/types/index.js'

export function getLoadWithContext(redirect: typeof coreRedirect) {
  return async ({ url, cookies }: Parameters<PageServerLoad>[0]) => {
    const sid = cookies.get('connect.sid')
    if (!sid) {
      const searchParams = new URLSearchParams()
      searchParams.set('show_auth', 'true')
      searchParams.set('login', 'true')
      searchParams.set('redirect', url.pathname + '?' + url.searchParams.toString())
      redirect(307, '/?' + searchParams.toString())
    }
  }
}
