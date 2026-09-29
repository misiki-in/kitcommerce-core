<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { browser } from '$app/environment'
	import { page } from '$app/state'
	import { loadStripe, type Stripe, type StripeElements, type StripePaymentMethodMessagingElement } from '@stripe/stripe-js'
	import { paymentMethodService } from '$lib/services'

	interface Props {
		amount: number
		currency?: string
		countryCode?: string
		paymentMethodTypes?: string[]
		publishableKey?: string | null
		class?: string
		logoColor?: 'primary' | 'grayscale' | 'white' | null
	}

	let {
		amount,
		currency = 'USD',
		countryCode = 'US',
		paymentMethodTypes = ['affirm'],
		publishableKey = null,
		class: klass = '',
		logoColor = 'primary'
	}: Props = $props()

	let container = $state<HTMLDivElement>()
	let stripe = $state<Stripe | null>(null)
	let elements = $state<StripeElements | null>(null)
	let messagingElement = $state<StripePaymentMethodMessagingElement | null>(null)
	let isEnabled = $state(false)
	let isMounted = $state(false)

	async function initStripeMessaging() {
		if (!browser) return

		try {
			let key = publishableKey
			if (!key) {
				const allPaymentMethods = await paymentMethodService.list({})
				const listOfPaymentMethods = allPaymentMethods?.data || []
				const stripePaymentMethod = listOfPaymentMethods.find((f: any) => {
					const name = f?.name?.toUpperCase?.()
					const code = f?.code?.toUpperCase?.()
					return name === 'STRIPE' || code === 'STRIPE'
				})
				if (stripePaymentMethod?.apiKey) {
					key = stripePaymentMethod.apiKey
				} else if (page.data?.store?.stripePublishableKey) {
					key = page.data.store.stripePublishableKey
				}
			}

			if (!key) {
				return
			}

			isEnabled = true
			stripe = await loadStripe(key)
			if (!stripe || !container) return

			elements = stripe.elements({
				appearance: {
					variables: {
						fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
						colorText: '#333333',
						fontSizeBase: '13px'
					}
				}
			})

			const safeCurrency = (currency || 'USD').toUpperCase()
			const safeCountry = (countryCode || 'US').toUpperCase()

			const options: any = {
				amount: Math.max(0, Math.round((amount || 0) * 100)),
				currency: safeCurrency,
				countryCode: safeCountry,
				paymentMethodTypes: paymentMethodTypes || ['affirm']
			}
			if (logoColor) {
				options.logoColor = logoColor
			}

			messagingElement = elements.create('paymentMethodMessaging', options)
			messagingElement.mount(container)
			isMounted = true
		} catch (e: any) {
			console.error('Failed to initialize Stripe Payment Method Messaging element:', e)
		}
	}

	$effect(() => {
		const currentAmount = Math.max(0, Math.round((amount || 0) * 100))
		const currentCurrency = (currency || 'USD').toUpperCase()
		const currentCountry = (countryCode || 'US').toUpperCase()

		if (messagingElement && isMounted) {
			try {
				messagingElement.update({
					amount: currentAmount,
					currency: currentCurrency,
					countryCode: currentCountry,
					paymentMethodTypes: paymentMethodTypes || ['affirm']
				})
			} catch (err) {
				console.warn('Stripe messaging element update error:', err)
			}
		}
	})

	onMount(() => {
		initStripeMessaging()
	})

	onDestroy(() => {
		if (messagingElement) {
			try {
				messagingElement.destroy()
			} catch (err) {
				console.warn('Error destroying Stripe messaging element:', err)
			}
			messagingElement = null
		}
	})
</script>

{#if isEnabled}
	<div bind:this={container} class="stripe-affirm-promo {klass}"></div>
{/if}

<style>
	.stripe-affirm-promo {
		min-height: 20px;
		display: block;
		margin: 6px 0;
	}
</style>
