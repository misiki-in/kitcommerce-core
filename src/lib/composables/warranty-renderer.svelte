<script lang="ts">
	import { warrantyService } from '$lib/services/index.js'
	import { fireGTagEvent } from '$lib/utils/gtag.js'
	import type { Snippet } from 'svelte'
	import { z } from 'zod'

	interface WarrantyInfo {
		fullName: string
		email: string
		phone: string
		orderId: string
		purchaseDate: string
		addressLine1?: string
		addressLine2?: string
		city?: string
		state?: string
		zipCode?: string
		country?: string
		notes?: string
	}

	interface Props {
		info: WarrantyInfo
		content: Snippet<[SnippetParams]>
	}

	const { content, info = $bindable() }: Props = $props()

	interface SnippetParams {
		success: boolean
		loading: boolean
		error: string
		errors: Record<string, string>
		handleSubmit: (e: Event) => void
		resetForm: () => void
	}

	let success = $state(false)
	let loading = $state(false)
	let error = $state('')
	let errors = $state<Record<string, string>>({})

	const schema = {
		fullName: z.string().min(2, 'Full name must be at least 2 characters'),
		email: z.string().email('Please enter a valid email address'),
		phone: z.string().min(6, 'Please enter a valid phone number'),
		orderId: z.string().min(1, 'Order ID is required'),
		purchaseDate: z.string().min(1, 'Date of purchase is required')
	}

	const validateForm = () => {
		errors = {}
		const nameResult = schema.fullName.safeParse(info.fullName)
		const emailResult = schema.email.safeParse(info.email)
		const phoneResult = schema.phone.safeParse(info.phone)
		const orderIdResult = schema.orderId.safeParse(info.orderId)
		const purchaseDateResult = schema.purchaseDate.safeParse(info.purchaseDate)

		if (!nameResult.success) errors.fullName = nameResult.error.errors[0].message
		if (!emailResult.success) errors.email = emailResult.error.errors[0].message
		if (!phoneResult.success) errors.phone = phoneResult.error.errors[0].message
		if (!orderIdResult.success) errors.orderId = orderIdResult.error.errors[0].message
		if (!purchaseDateResult.success) errors.purchaseDate = purchaseDateResult.error.errors[0].message

		return nameResult.success && emailResult.success && phoneResult.success && orderIdResult.success && purchaseDateResult.success
	}

	const resetForm = () => {
		info.fullName = ''
		info.email = ''
		info.phone = ''
		info.orderId = ''
		info.purchaseDate = ''
		info.addressLine1 = ''
		info.addressLine2 = ''
		info.city = ''
		info.state = ''
		info.zipCode = ''
		info.notes = ''
		errors = {}
		error = ''
		success = false
	}

	const handleSubmit = async (event: Event) => {
		event.preventDefault()
		if (!validateForm()) return

		loading = true
		error = ''
		try {
			await warrantyService.submitWarrantyRegistration({
				fullName: info.fullName,
				email: info.email,
				phone: info.phone,
				orderId: info.orderId,
				purchaseDate: info.purchaseDate,
				addressLine1: info.addressLine1,
				addressLine2: info.addressLine2,
				city: info.city,
				state: info.state,
				zipCode: info.zipCode,
				country: info.country || 'United States',
				notes: info.notes
			})
			fireGTagEvent('warranty_registration', { order_id: info.orderId })
			success = true
		} catch (err: any) {
			console.error('Failed to submit warranty:', err)
			error = err?.message || 'Failed to register warranty. Please try again later.'
		} finally {
			loading = false
		}
	}
</script>

{@render content({
	handleSubmit,
	resetForm,
	errors,
	loading,
	error,
	success
})}
