// Self-check for the direct Klarna / Afterpay routing. Run with `bun run test`.
import assert from 'node:assert'
import { directBnplCaptureBody, directBnplGateway } from './direct-bnpl.ts'

const url = (query: string) => new URL(`https://shop.test/checkout/process?${query}`)

// Codes match case-insensitively; the return URL carries `pg=klarna_pay`, placeOrder sees `KLARNA_PAY`.
assert.strictEqual(directBnplGateway('klarna_pay')?.label, 'Klarna')
assert.strictEqual(directBnplGateway('AFTERPAY_PAY')?.label, 'Afterpay')

// The Stripe sub-methods keep going through the Stripe branches.
for (const code of ['klarna', 'afterpay', 'afterpay_clearpay', 'stripe', 'paypal', '', null, undefined, 'toString', '__proto__']) {
	assert.strictEqual(directBnplGateway(code), undefined, `${code} must not be a direct gateway`)
}

// Klarna returns with its HPP session id.
assert.deepStrictEqual(
	directBnplCaptureBody(directBnplGateway('klarna_pay')!, url('order_no=10001&cart_id=c1&store_id=s1&pg=klarna_pay&sid=hpp_1')),
	{ order_no: '10001', store_id: 's1', sid: 'hpp_1' }
)

// Afterpay appends status and orderToken. Only status is forwarded.
assert.deepStrictEqual(
	directBnplCaptureBody(
		directBnplGateway('afterpay_pay')!,
		url('order_no=10002&cart_id=c1&store_id=s1&pg=afterpay_pay&status=SUCCESS&orderToken=002.abc')
	),
	{ order_no: '10002', store_id: 's1', status: 'SUCCESS' }
)

// Missing params become empty strings, which the API rejects.
assert.deepStrictEqual(directBnplCaptureBody(directBnplGateway('afterpay_pay')!, url('pg=afterpay_pay')), {
	order_no: '',
	store_id: '',
	status: ''
})

console.log('direct-bnpl: ok')
