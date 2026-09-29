<script lang="ts">
	import { onMount } from 'svelte'
	import { browser } from '$app/environment'
	import { paymentMethodService } from '$lib/services'
	import AffirmPayPromo from './affirm-pay-promo.svelte'
	import StripeAffirmPromo from './stripe-affirm-promo.svelte'

	interface Props {
		amount: number
		pageType?: 'homepage' | 'landing' | 'search' | 'category' | 'product' | 'cart' | 'payment' | 'banner' | 'marketplace'
		class?: string
		promoId?: string | null
		sku?: string | null
		brand?: string | null
		category?: string | null
		color?: 'black' | 'white' | null
		logoType?: 'text' | 'symbol' | null
		currency?: string
		countryCode?: string
	}

	let {
		amount,
		pageType = 'product',
		class: klass = '',
		promoId = null,
		sku = null,
		brand = null,
		category = null,
		color = null,
		logoType = null,
		currency = 'USD',
		countryCode = 'US'
	}: Props = $props()

	let activeProvider = $state<'affirm' | 'stripe' | null>(null)

	async function checkPaymentMethods() {
		if (!browser) return
		try {
			const allPaymentMethods = await paymentMethodService.list({})
			const listOfPaymentMethods = allPaymentMethods?.data || []

			const hasDirectAffirm = listOfPaymentMethods.some((f: any) => {
				const name = f?.name?.toUpperCase?.()
				const code = f?.code?.toUpperCase?.()
				return (name === 'AFFIRMPAY' || code === 'AFFIRMPAY' || code === 'AFFIRM_PAY' || name === 'AFFIRM') && !!f?.apiKey
			})

			if (hasDirectAffirm) {
				activeProvider = 'affirm'
				return
			}

			const hasStripe = listOfPaymentMethods.some((f: any) => {
				const name = f?.name?.toUpperCase?.()
				const code = f?.code?.toUpperCase?.()
				return (name === 'STRIPE' || code === 'STRIPE') && !!f?.apiKey
			})

			if (hasStripe) {
				activeProvider = 'stripe'
				return
			}
		} catch (err) {
			console.error('Failed to determine Affirm payment provider:', err)
		}
	}

	onMount(checkPaymentMethods)
</script>

{#if activeProvider === 'affirm'}
	<AffirmPayPromo
		{amount}
		{pageType}
		{promoId}
		{sku}
		{brand}
		{category}
		{color}
		{logoType}
		class="affirm-as-low-as {klass}"
	/>
{:else if activeProvider === 'stripe'}
	<StripeAffirmPromo
		{amount}
		currency={(currency || 'USD').toUpperCase()}
		countryCode={(countryCode || 'US').toUpperCase()}
		paymentMethodTypes={['affirm']}
		class={klass}
	/>
{/if}
