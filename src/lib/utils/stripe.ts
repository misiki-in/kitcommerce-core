/**
 * This is a singleton to ensure we only instantiate Stripe once.
 */
import { loadStripe } from '@stripe/stripe-js'

let stripePromiseMap: Record<string, Promise<any>> = {}

export const getStripe = (publishableKey?: string) => {
	const key = publishableKey
	if (!key) return null

	if (!stripePromiseMap[key]) {
		stripePromiseMap[key] = loadStripe(key)
	}
	return stripePromiseMap[key]
}

export default getStripe

