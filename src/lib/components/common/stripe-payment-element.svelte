<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import {
		loadStripe,
		type Stripe,
		type StripeElements,
		type StripeExpressCheckoutElement
	} from '@stripe/stripe-js';
	import { checkoutService } from '@misiki/litekart-connector';
	import { getStripe } from '../../utils/stripe.js';
	import LoadingDots from './loading-dots.svelte';

	interface Props {
		cartState?: any;
		paymentModule?: any;
		class?: string;
		onready?: () => void;
	}

	let { cartState, paymentModule, class: className = '', onready }: Props = $props();

	let container = $state<HTMLDivElement | null>(null);
	let stripe = $state<Stripe | null>(null);
	let elements = $state<StripeElements | null>(null);
	let expressCheckoutElement = $state<StripeExpressCheckoutElement | null>(null);

	let isLoading = $state(true);
	let errorMessage = $state('');
	let available = $state(true);
	let readyTimeout: ReturnType<typeof setTimeout> | null = null;

	function getPublishableKey(): string {
		const stripeMethod = paymentModule?.allPaymentMethods?.find((m: any) =>
			['STRIPE'].includes(m?.code?.toUpperCase?.() || '')
		);
		return (
			stripeMethod?.apiKey ||
			page.data?.store?.stripePublishableKey ||
			page.data?.store?.apiKey ||
			''
		);
	}

	onMount(async () => {
		if (typeof window === 'undefined') return;

		try {
			const pubKey = getPublishableKey();
			if (!pubKey) {
				errorMessage = 'Stripe publishable key is not configured';
				isLoading = false;
				return;
			}

			// 1. Retrieve or instantiate singleton cached Stripe instance
			const stripePromise = getStripe(pubKey);
			stripe = stripePromise ? await stripePromise : null;

			if (!stripe || !container) {
				isLoading = false;
				return;
			}

			const rawTotal = Number(cartState?.cart?.total || 1);
			const currency = (page.data?.store?.currency?.code || 'usd').toLowerCase();
			const amount = Math.max(50, Math.round(rawTotal * 100));

			const shippingCountry = (
				cartState?.cart?.shippingAddress?.countryCode ||
				cartState?.cart?.shippingAddress?.country ||
				page.data?.store?.countryCode ||
				'US'
			)
				.toUpperCase()
				.trim();

			elements = stripe.elements({
				mode: 'payment',
				amount,
				currency,
				appearance: {
					theme: 'stripe',
					variables: {
						borderRadius: '6px'
					}
				}
			});

			expressCheckoutElement = elements.create('expressCheckout', {
				buttonHeight: 48,
				buttonTheme: {
					applePay: 'black',
					googlePay: 'black'
				},
				layout: {
					maxColumns: 1,
					maxRows: 2
				}
			});

			// Fallback timeout: if Stripe wallet check hangs or takes too long, stop blocking UI
			readyTimeout = setTimeout(() => {
				if (isLoading) {
					isLoading = false;
					available = false;
				}
			}, 6000);

			expressCheckoutElement.mount(container);

			expressCheckoutElement.on('ready', (event) => {
				if (readyTimeout) clearTimeout(readyTimeout);
				isLoading = false;
				const availablePaymentMethods = event.availablePaymentMethods;
				if (availablePaymentMethods) {
					const hasAny = Object.values(availablePaymentMethods).some(Boolean);
					available = hasAny;
				}
				onready?.();
			});

			expressCheckoutElement.on('click', (event) => {
				const pgCode = event.expressPaymentType || 'stripe';
				if (paymentModule) {
					paymentModule.handlePaymentMethodChange(pgCode);
				}
				event.resolve();
			});

			expressCheckoutElement.on('confirm', async (event) => {
				const cartId = cartState?.cart?.id || localStorage.getItem('cart_id') || '';
				if (!cartId) {
					toast.error('Cart is missing');
					return;
				}

				const pgCode = event.expressPaymentType || paymentModule?.SELECTED_PG_CODE || 'stripe';

				try {
					const apiRes = await fetch('/api/checkout/stripe', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							cartId,
							origin: window.location.origin,
							pg: pgCode,
							use_elements: true
						})
					});

					const res: any = await apiRes.json();
					const clientSecret = res?.client_secret || '';
					const orderNo = res?.order_no || res?.id || '';
					const returnUrl = `${window.location.origin}/checkout/process?cart_id=${cartId}&order_no=${orderNo}&pg=${pgCode}&payment_session_id=${res?.payment_session_id}`;

					if (!clientSecret) {
						toast.error(res?.message || 'Failed to initialize payment');
						return;
					}

					const { error, paymentIntent } = (await stripe!.confirmPayment({
						elements: elements!,
						clientSecret,
						confirmParams: {
							return_url: returnUrl
						}
					})) as unknown as {
						error: { message: string };
						paymentIntent: { status: string; id: string };
					};

					if (error) {
						toast.error(error.message || 'Payment failed');
						return;
					}

					if (
						paymentIntent &&
						(paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')
					) {
						window.location.href = `${window.location.origin}/checkout/process?cart_id=${cartId}&order_no=${orderNo}&pg=${pgCode}&payment_session_id=${paymentIntent.id}`;
					} else if (res?.url) {
						window.location.href = res.url;
					}
				} catch (err: any) {
					console.error('Express checkout error:', err);
					toast.error(err?.message || 'Payment processing error');
				}
			});

			expressCheckoutElement.on('loaderror', (event) => {
				if (readyTimeout) clearTimeout(readyTimeout);
				isLoading = false;
				errorMessage = event.error?.message || 'Failed to load express checkout';
			});
		} catch (err: any) {
			if (readyTimeout) clearTimeout(readyTimeout);
			console.error('Error mounting Stripe Express Checkout:', err);
			isLoading = false;
			errorMessage = err?.message || 'Could not load express checkout';
		}
	});

	onDestroy(() => {
		if (readyTimeout) clearTimeout(readyTimeout);
		if (expressCheckoutElement) {
			try {
				expressCheckoutElement.destroy();
			} catch {}
			expressCheckoutElement = null;
		}
	});
</script>

<div class="w-full {className}" class:hidden={!available && !isLoading}>
	{#if isLoading}
		<div class="bg-muted/20 flex h-12 w-full items-center justify-center rounded-md border">
			<LoadingDots />
		</div>
	{/if}

	{#if errorMessage}
		<div class="text-destructive mb-2 text-sm">{errorMessage}</div>
	{/if}

	<div bind:this={container} class="w-full" class:hidden={isLoading}></div>
</div>
