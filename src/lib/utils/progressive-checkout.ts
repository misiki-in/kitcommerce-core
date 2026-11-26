// Progressive Leasing's window (ChargeAfter SDK), opened over the payment step.
// https://docs.chargeafter.com/docs/present
export interface ProgressiveEmbed {
	sdk_url: string
	api_key: string
	ca_store_id?: string
	checkout: any
	success_url: string
	failed_url: string
}

const SDK_HOSTS = ['https://cdn.chargeafter.com/', 'https://cdn-sandbox.ca-dev.co/']
let sdk: { key: string; ready: Promise<any> } | null = null

function loadSdk(embed: ProgressiveEmbed): Promise<any> {
	if (!SDK_HOSTS.some((h) => embed.sdk_url.startsWith(h))) {
		return Promise.reject(new Error('Unexpected Progressive Leasing script'))
	}
	const key = `${embed.sdk_url}|${embed.api_key}|${embed.ca_store_id || ''}`
	if (sdk?.key === key) return sdk.ready
	const ready = new Promise<any>((resolve, reject) => {
		const fail = () => reject(new Error('Progressive Leasing could not be loaded'))
		const timer = setTimeout(fail, 20000)
		const script = document.createElement('script')
		script.src = embed.sdk_url
		script.async = true
		script.onerror = () => {
			script.remove()
			fail()
		}
		script.onload = () => {
			const ca = (window as any).ChargeAfter
			if (!ca) return fail()
			try {
				ca.init({
					apiKey: embed.api_key,
					...(embed.ca_store_id ? { storeId: embed.ca_store_id } : {}),
					onLoaded: () => {
						clearTimeout(timer)
						resolve((window as any).ChargeAfter)
					}
				})
			} catch {
				fail()
			}
		}
		document.head.appendChild(script)
	})
	sdk = { key, ready }
	// A failed load may be tried again.
	ready.catch(() => {
		if (sdk?.ready === ready) sdk = null
	})
	return ready
}

/** Resolves once the window is opened. `onClose` runs when the shopper leaves it without paying. */
export async function openProgressiveCheckout(
	embed: ProgressiveEmbed,
	onClose: (message?: string) => void
): Promise<void> {
	const ca = await loadSdk(embed)
	let done = false
	let confirmed: string | null = null

	const opened = ca.payments.present('checkout', {
		...embed.checkout,
		onConfirm: (token: string) => {
			confirmed = token
		},
		// Shipping and tax were worked out at checkout, so the amounts never change here.
		onDataUpdate: (_data: any, cb?: (v: any) => void) => {
			cb?.({})
			return {}
		},
		callback: (token: string | null, _data: any, status: any) => {
			if (done) return
			done = true
			const paid = token || confirmed
			if (paid) {
				window.location.href = `${embed.success_url}&ca_token=${encodeURIComponent(paid)}`
				return
			}
			const code = status?.code
			if (code === 'CONSUMER_CANCELLED' || code === 'BACK_TO_STORE') return onClose()
			if (code === 'BILLING_SHIPPING_MISMATCH') {
				return onClose('Progressive Leasing needs the same billing and shipping address')
			}
			if (code === 'PENDING') return onClose('Your Progressive Leasing application is still being reviewed')
			onClose('Progressive Leasing could not continue. Please choose another payment method')
		}
	})
	Promise.resolve(opened).catch((e) => {
		if (done) return
		done = true
		console.warn('Progressive Leasing:', e)
		onClose('Progressive Leasing could not be opened. Please try again')
	})
}
