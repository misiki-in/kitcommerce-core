import { CheckoutService } from '$lib/services';
import type { PageServerLoad } from '$lib/types/index.js';
import { redirect as coreRedirect } from '@sveltejs/kit';

export function getLoadWithContext(redirect: typeof coreRedirect) {
	return async ({ url, fetch }) => {
		const paymentSessionId = url.searchParams.get('payment_session_id');
		const cart_id = url.searchParams.get('cart_id');
		const order_no = url.searchParams.get('order_no');
		const storeId = url.searchParams.get('store_id');

		let failed = true;
		let pg_name = url.searchParams.get('pg');
		try {
			if (pg_name?.toUpperCase?.() === 'STRIPE') {
				const checkoutService = new CheckoutService(fetch);
				await checkoutService.checkoutStripeCapture({
					order_no,
					pg: pg_name,
					payment_session_id: paymentSessionId,
					storeId
				});
				console.log(`🚀 ~ payment processed.........: ${order_no}`);
			}
			failed = false;
		} catch (e) {
			failed = true;
			console.log('Payment process error::: eeeeeeeeeeeee', e);
		}
		redirect(
			307,
			`/checkout/${failed === true ? 'failed' : 'success'}?cart_id=${cart_id}&order_no=${order_no}`
		);
	};
}
