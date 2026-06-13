import type { LayoutServerLoad } from '$lib/types/load-functions.js';
import { redirect as coreRedirect } from '@sveltejs/kit';

export function getLoadWithContext(redirect: typeof coreRedirect): LayoutServerLoad {
  return async ({ url, cookies }) => {
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
