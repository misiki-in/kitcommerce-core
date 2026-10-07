// The payment reference /checkout/process forwards to capture. Our own redirects name it
// payment_session_id; when Stripe redirects itself (Express Checkout: Apple Pay, Google Pay)
// it appends payment_intent instead.
export function paymentReferenceFromUrl(url: URL): string | null {
	return url.searchParams.get('payment_session_id') || url.searchParams.get('payment_intent')
}
