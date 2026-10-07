// Self-check for reading the payment reference off /checkout/process. Run with `bun run test`.
import assert from 'node:assert'
import { paymentReferenceFromUrl } from './payment-reference.ts'

const ref = (query: string) => paymentReferenceFromUrl(new URL(`https://shop.test/checkout/process?${query}`))

// Our own redirects (Checkout Session, card Payment Element) name it payment_session_id.
assert.strictEqual(ref('order_no=985&pg=stripe&payment_session_id=cs_test_1'), 'cs_test_1')

// The bug this fixes: Express Checkout (Apple Pay / Google Pay) lets Stripe redirect,
// and Stripe names it payment_intent. Reading only payment_session_id sent null to capture.
assert.strictEqual(
	ref('order_no=985&pg=apple_pay&payment_intent=pi_3ApplePay&payment_intent_client_secret=pi_secret&redirect_status=succeeded'),
	'pi_3ApplePay'
)

// Ours wins if both are present.
assert.strictEqual(ref('payment_session_id=cs_test_1&payment_intent=pi_3ApplePay'), 'cs_test_1')

assert.strictEqual(ref('order_no=985'), null)

console.log('payment-reference: ok')
