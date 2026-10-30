import { page } from '$app/state'
import { authService } from '$lib/services/index.js'
import { getUserState } from '$lib/stores/index.js'
import { onMount } from 'svelte'
import { toast } from 'svelte-sonner'

export class ResetPasswordModule {
  static _instance: ResetPasswordModule

	userState = getUserState()
	email: string = $state('')
	success = $state(false)
	isLoading = $state(false)
	error: string = $state('')
	password: string = $state('')
	token: string = $state('')
	userId: string = $state('')
	retype: string = $state('')

	constructor() {
		onMount(() => {
			try {
				this.token = page.url.searchParams.get('token') || ''
				this.userId = page.url.searchParams.get('id') || ''
				// Read once; the token resets the account's password, so it leaves the address bar,
				// the history and every analytics tag that records the page. A reload then asks for a
				// new link. The browser's own replaceState, with SvelteKit's state kept: the router's
				// throws when called from onMount on the first page.
				const clean = new URL(location.href)
				clean.searchParams.delete('token')
				clean.searchParams.delete('id')
				history.replaceState(history.state, '', clean)
				if (!this.token && !this.userId) {
					toast.error('Invalid password reset link')
					return
				}
			} catch (e: any) {
				console.error('Mount failed', e)
			}
		})
	}

	handleSubmit = async () => {
		if (this.password.length > 0 && this.password === this.retype) {
			await authService.resetPassword({ userId: this.userId, token: this.token, password: this.password })
			toast.info('Password Reset Successful')
			this.userState.logout()
			return
		}
		toast.error("Password and Retype don't match")
	}
}

