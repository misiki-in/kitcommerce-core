import { page } from '$app/state'
import { orderService, type Order } from '$lib/services/index.js'
import { onMount } from 'svelte'
import { toast } from 'svelte-sonner'
import { getInstance, setInstance } from './helpers/index.ts'

class OrderTrackingModule {
  static _instance: OrderTrackingModule

	loading = $state(true)
	order: Order | null = $state(null)

	constructor() {
		onMount(async () => {
			try {
				this.loading = true
				const otp = page.url?.searchParams?.get('otp') || ''
				const email = page.url?.searchParams?.get('email') || ''
				const res = await orderService.getOrderByEmailAndOTP({ email, otp })

				if (res?.data) {
					this.order = res.data[0]
				} else {
					toast.error('Order not found')
				}
			} catch (error) {
				console.log(error)
			} finally {
				this.loading = false
			}
		})
	}
}

export const getOrderTrackingModule = getInstance(OrderTrackingModule)
export const setOrderTrackingModule = setInstance(OrderTrackingModule)
