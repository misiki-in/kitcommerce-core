import type { StoreData } from '$lib/types'
import type { PageServerLoad } from '$lib/types/index.ts'
import { checkSecuredCatalogue } from '$lib/utils'

export const load: PageServerLoad = async ({ cookies, url, request, parent }) => {
	const { store }: { store: StoreData | {} } = await parent()

	if (store?.plugins?.isSecureCatalogue?.active) {
		checkSecuredCatalogue(!!cookies.get('connect.sid'), request.headers.get('referer'), url)
	}
}

