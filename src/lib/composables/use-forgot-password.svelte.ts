import { goto, replaceState } from '$app/navigation'
import { authService } from '$lib/services/index.js'
import { toast } from 'svelte-sonner'
import { z } from 'zod'

export const forgotPasswordSchema = {
	email: z
		.string()
		.email('Please enter a valid email address')
		.min(5, 'Email must be at least 5 characters')
		.max(100, 'Email must be less than 100 characters')
		.refine((val) => val.includes('@'), {
			message: 'Please enter a valid email address'
		})
}

export class ForgotPasswordModule {
  static _instance: ForgotPasswordModule

	// Never read from or written to the URL: every analytics tag on the page records the URL, and
	// the history keeps it. A caller with an address to offer sets it.
	email = $state('')
	success = $state(false)
	isLoading = $state(false)

	handleSubmit = async (e: SubmitEvent, redirectAfterSuccess: boolean) => {
		e.preventDefault()
		try {
			this.isLoading = true
			const referrer = new URL(window.location.href)?.origin
			await authService.forgotPassword({ email: this.email, referrer })
			if (redirectAfterSuccess) goto('/auth/forgot-password/success')
			this.success = true
		} catch (e: any) {
			toast.error(e.message)
		} finally {
			this.isLoading = false
		}
	}

	removeUrlParams = () => {
		if (typeof window !== 'undefined') {
			const url = new URL(window.location.href)
			url.search = ''
			replaceState(url.toString(), {})
		}
	}
}

