/**
 * This is a singleton to ensure we only instantiate Stripe once.
 */
import { env } from '$env/dynamic/public'
import { loadStripe } from '@stripe/stripe-js'
import type { Stripe } from '@stripe/stripe-js'
// import env from '$env/static/public'

let stripePromise: Promise<Stripe | null> | undefined

const getStripe = () => {
	const publicEnv = env as Record<string, string | undefined>
	stripePromise = loadStripe(publicEnv.PUBLIC_STRIPE_PUBLISHABLE_KEY ?? publicEnv.STRIPE_PUBLISHABLE_KEY ?? '')
	return stripePromise
}

export default getStripe
