// Klarna and Afterpay connected directly to the API, not through Stripe. They use their own
// codes (`klarna_pay`, `afterpay_pay`) because `klarna` / `afterpay` already mean the Stripe
// sub-methods, which the Stripe branches handle. The API places the order and returns the
// provider's redirect_url. The provider sends the shopper back to /checkout/process?pg=<code>,
// and the API checks the payment with the provider (amount, order reference, status) before
// it confirms the order.
export interface DirectBnplGateway {
	label: string
	checkout: string
	capture: string
	// Return-URL params the capture needs. Anything else the provider appends (e.g. Afterpay's
	// orderToken) is not forwarded; the API reads the token it stored with the order.
	returnParams: string[]
}

export const DIRECT_BNPL_GATEWAYS: Record<string, DirectBnplGateway> = {
	KLARNA_PAY: {
		label: 'Klarna',
		checkout: '/api/checkout/klarna',
		capture: '/api/checkout/klarna-capture',
		returnParams: ['sid']
	},
	AFTERPAY_PAY: {
		label: 'Afterpay',
		checkout: '/api/checkout/afterpay',
		capture: '/api/checkout/afterpay-capture',
		returnParams: ['status']
	}
}

export function directBnplGateway(code: string | null | undefined): DirectBnplGateway | undefined {
	const key = code?.toUpperCase?.() || ''
	return Object.prototype.hasOwnProperty.call(DIRECT_BNPL_GATEWAYS, key) ? DIRECT_BNPL_GATEWAYS[key] : undefined
}

// The body /checkout/process posts to the gateway's capture endpoint.
export function directBnplCaptureBody(gateway: DirectBnplGateway, url: URL): Record<string, string> {
	const body: Record<string, string> = {
		order_no: url.searchParams.get('order_no') || '',
		store_id: url.searchParams.get('store_id') || ''
	}
	for (const p of gateway.returnParams) body[p] = url.searchParams.get(p) || ''
	return body
}
