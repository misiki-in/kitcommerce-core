import { browser } from '$app/environment'
import { replaceState } from '$app/navigation'
import { showModal } from './auth-store.ts'

export type AuthType = 'login' | 'signup' | 'forgot-password'

// A shopper's address or number never goes into the URL: every analytics tag on the page records
// it, and the history keeps it. A caller that passes one along to the next screen loses it here.
const PERSONAL = ['email', 'phone']

export function updateQueryParam(key: string, value: string, extraqueries?: Record<string, string>) {
	const url = new URL(window.location.href)
	url.searchParams.set(key, value)
	if (extraqueries) {
		for (const [key, value] of Object.entries(extraqueries)) {
			if (PERSONAL.includes(key)) continue
			url.searchParams.set(key, encodeURIComponent(value))
		}
	}
	if (browser) replaceState(url, {})
}

export function removeQueryParam(key: string) {
	const url = new URL(window.location.href)
	url.searchParams.delete(key)
	if (browser) replaceState(url, {})
}

export function removeAllQueryParams() {
	const url = new URL(window.location.href)
	url.search = ''
	if (browser) replaceState(url, {})
}

export function showAuthModal(type: AuthType, extraqueries?: Record<string, string>) {
	removeAllQueryParams()

	if (type === 'login') {
		updateQueryParam('show_auth', 'true')
		updateQueryParam('login', 'true', extraqueries)
	} else if (type === 'signup') {
		updateQueryParam('show_auth', 'true')
		updateQueryParam('signup', 'true', extraqueries)
	} else if (type === 'forgot-password') {
		updateQueryParam('show_auth', 'true')
		updateQueryParam('forgot-password', 'true', extraqueries)
	}

	showModal.set(true)
	showModal.set(false)
}
