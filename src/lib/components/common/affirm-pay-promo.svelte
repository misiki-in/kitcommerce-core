<script lang="ts">
	import { paymentMethodService } from '$lib/services'
	import { injectAffirm } from '$lib/utils'
	import { onMount } from 'svelte'
	import { browser } from '$app/environment'

	interface Props {
		pageType?: 'homepage' | 'landing' | 'search' | 'category' | 'product' | 'cart' | 'payment' | 'banner' | 'marketplace'
		class?: 'affirm-as-low-as' | 'affirm-site-modal' | 'affirm-product-modal' | string
		amount: number
		promoId?: string | null
		sku?: string | null
		brand?: string | null
		category?: string | null
		color?: 'black' | 'white' | null
		logoType?: 'text' | 'symbol' | null
	}

	let {
		amount,
		pageType = 'product',
		promoId = null,
		class: klass = 'affirm-as-low-as',
		logoType = null,
		sku = null,
		brand = null,
		category = null,
		color = null
	}: Props = $props()

	let isEnabled = $state(false)

	async function loadAffirm() {
		if (!browser) return
		try {
			const allPaymentMethods = await paymentMethodService.list({})
			const listOfPaymentMethods = allPaymentMethods?.data || []

			const affirmPaymentMethod = listOfPaymentMethods.find((f: any) => {
				const name = f?.name?.toUpperCase?.()
				const code = f?.code?.toUpperCase?.()
				return name === 'AFFIRMPAY' || code === 'AFFIRMPAY' || code === 'AFFIRM_PAY' || name === 'AFFIRM'
			}) || null

			if (affirmPaymentMethod?.apiKey) {
				isEnabled = true
				await injectAffirm(affirmPaymentMethod.apiKey, affirmPaymentMethod.isTest)
				if (typeof (window as any).affirm !== 'undefined' && (window as any).affirm?.ui?.refresh) {
					;(window as any).affirm.ui.refresh()
				}
			}
		} catch (e: any) {
			console.error('Failed to load affirm prequalify:', e)
		}
	}

	$effect(() => {
		if (amount && browser && typeof (window as any).affirm !== 'undefined' && (window as any).affirm?.ui?.refresh) {
			;(window as any).affirm.ui.refresh()
		}
	})

	onMount(loadAffirm)
</script>

{#if isEnabled}
	<p
		class={klass}
		data-page-type={pageType}
		data-amount={Math.max(0, Math.round((amount || 0) * 100))}
		data-sku={sku}
		data-promo-id={promoId}
		data-category={category}
		data-affirm-color={color}
		data-affirm-type={logoType}
		data-brand={brand}
	></p>
{/if}
