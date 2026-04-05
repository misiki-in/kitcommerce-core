import { showAuthModal } from '$lib/components/index.js'
import { userService } from '$lib/services/index.js'
import { getUserState } from '$lib/stores/index.js'
import { onMount } from 'svelte'
import { toast } from 'svelte-sonner'

export class ChangePasswordModule {
  static _instance: ChangePasswordModule

	userState = getUserState()
	old: string = $state('')
	password: string = $state('')
	retype: string = $state('')
	loading: boolean = $state(false)
	showOld: boolean = $state(false)
	showNew: boolean = $state(false)
	showRetype: boolean = $state(false)
	isValid: boolean = $state(false)
	errors = $state({
		old: '',
		password: '',
		retype: ''
	})

	constructor() {
		onMount(async () => {
			if (!this.userState?.user) {
				showAuthModal('login')
			}
		})
		$effect(() => {
			this.errors = {
				old: this.old.length > 0 ? '' : 'Old password is required',
				password: this.password.length >= 6 ? '' : 'Password must be at least 6 characters',
				retype: this.password === this.retype ? '' : 'Passwords do not match'
			}
		})

		$effect(() => {
			this.isValid = !this.errors.old && !this.errors.password && !this.errors.retype && !!this.old && !!this.password && !!this.retype
		})
	}

	handleSubmit = async () => {
		if (!this.isValid) {
			toast.error('Please fix the errors before submitting')
			return
		}

		try {
			this.loading = true
			let res = await userService.changePassword({ old: this.old, password: this.password })
			if (res.id) {
				toast.success('Password changed successfully')
				this.userState.logout()
				// goto('/auth/change-password/success') // This does not work as it is already loggedout
				return
			}
			toast.error('Invalid old password')
		} catch (e: any) {
			toast.error(e?.message || 'Failed to change password')
		} finally {
			this.loading = false
		}
	}
}

