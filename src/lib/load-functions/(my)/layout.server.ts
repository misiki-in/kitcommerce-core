import type { LayoutServerLoad } from '$lib/types/index.js'
import { redirect } from '@sveltejs/kit'

export const load: LayoutServerLoad = async ({ fetch, cookies }) => {
	const sid = cookies.get('connect.sid')
	// console.log('🚀 ~ load ~ sid:', sid)
	if (!sid) redirect(307, '/?show_auth=true&login=true')
}
