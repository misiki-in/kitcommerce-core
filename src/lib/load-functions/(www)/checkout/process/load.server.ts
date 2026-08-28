import { CheckoutService } from '$lib/services/index.js';
import type { PageLoad } from '$lib/types/load-functions.js';
import { redirect as coreRedirect } from '@sveltejs/kit';

export function getLoadWithContext(redirect: typeof coreRedirect): PageLoad {
	return async ({ url, fetch }) => {
		const paymentSessionId = url.searchParams.get('payment_session_id');
		const cart_id = url.searchParams.get('cart_id');
		const order_no = url.searchParams.get('order_no');
		const storeId = url.searchParams.get('store_id');
		const token = url.searchParams.get('token');
		const PayerID = url.searchParams.get('PayerID');

		let failed = true;
		let pg_name = url.searchParams.get('pg');
		try {
			const pgUpper = pg_name?.toUpperCase?.() || '';
			if (['STRIPE', 'APPLE_PAY', 'APPLEPAY', 'STRIPE_APPLE_PAY', 'KLARNA', 'AFTERPAY', 'AFTERPAY_CLEARPAY'].includes(pgUpper)) {
				const checkoutService = new CheckoutService(fetch);
				await checkoutService.checkoutStripeCapture({
					order_no,
					pg: pg_name,
					payment_session_id: paymentSessionId,
					storeId
				});
				
			} else if (pgUpper === 'CASHFREE') {
				const checkoutService = new CheckoutService(fetch);
				await checkoutService.captureCashfreePayment({
					order_no: order_no || ''
				});
				
			} else if (pgUpper === 'PAYPAL') {
				const checkoutService = new CheckoutService(fetch);
				if (typeof (checkoutService as any).capturePaypalPayment === 'function') {
					await (checkoutService as any).capturePaypalPayment({
						order_no: order_no || '',
						token: token || paymentSessionId || '',
						PayerID: PayerID || '',
						storeId: storeId || ''
					});
				} else {
					await (checkoutService as any).post('/api/checkout/paypal-capture', {
						order_no: order_no || '',
						token: token || paymentSessionId || '',
						PayerID: PayerID || '',
						storeId: storeId || ''
					});
				}
			}
			failed = false;
		} catch (e) {
			failed = true;
			console.error('Payment process error:', e);
		}
		redirect(
			307,
			`/checkout/${failed === true ? 'failed' : 'success'}?cart_id=${cart_id}&order_no=${order_no}`
		);
	};
}
