import { userService } from '$lib/services/index.js'
import { getUserState } from '$lib/stores/index.js'
import { toast } from 'svelte-sonner'

export class MyProfileDeleteModule {
  static _instance: MyProfileDeleteModule

	user = getUserState()
	iAgree = $state(false)

	deleteUser = async () => {
		if (!this.iAgree) return

		try {
			const me = this.user.retrieveUserId()?.me
			if (!me?.userId) throw 'User Id not found'
			await userService.deleteUser(me.userId)
			window.location.reload()
			toast.success('Account deleted successfully')
		} catch (e) {
			console.error(e)
			toast.error('Account deletion failed')
		}
	}
}

