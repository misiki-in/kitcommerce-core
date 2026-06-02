import type { LayoutServerLoad } from '$lib/types/index.js'
import { redirect } from '@sveltejs/kit'

export const load: LayoutServerLoad = async ({ url, cookies }) => {
	const sid = cookies.get('connect.sid')
	if (!sid) {
    const searchParams = new URLSearchParams()
    searchParams.set('show_auth', 'true')
    searchParams.set('login', 'true')
    searchParams.set('redirect', url.pathname + '?' + url.searchParams.toString())
    redirect(307, '/?' + searchParams.toString())
  }
}
