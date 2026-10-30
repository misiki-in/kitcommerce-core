import { page } from '$app/state'
import { orderService, type Order } from '$lib/services/index.js'
import { onMount } from 'svelte'
import { toast } from 'svelte-sonner'

export class OrderTrackingModule {
  static _instance: OrderTrackingModule

	loading = $state(true)
	order: Order | null = $state(null)

	constructor() {
		onMount(async () => {
			try {
				this.loading = true
				const otp = page.url?.searchParams?.get('otp') || ''
				const email = page.url?.searchParams?.get('email') || ''
				// Read once; the address and the code that opens the order leave the address bar, the
				// history and every analytics tag that records the page.
				const clean = new URL(location.href)
				clean.searchParams.delete('otp')
				clean.searchParams.delete('email')
				history.replaceState(history.state, '', clean)
				const res = await orderService.getOrderByEmailAndOTP({ email, otp })

				if (res?.data) {
					this.order = res.data[0]
				} else {
					toast.error('Order not found')
				}
			} catch (error) {
				console.error('Mount failed', error)
			} finally {
				this.loading = false
			}
		})
	}
}

