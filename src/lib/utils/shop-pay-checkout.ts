// Shopify's own Shop Pay button, shown over the payment step. The behaviour lives in the API's
// client.js, shared with its hosted page, so it can be fixed without a storefront release.
// https://shopify.dev/docs/api/commerce-components/pay
export interface ShopPayEmbed {
	client_url: string
	[key: string]: any
}

let session = 0

function loadClient(url: string): Promise<any> {
	const w = window as any
	if (!/^\/api\/checkout\/shop-pay\//.test(url)) return Promise.reject(new Error('Unexpected Shop Pay script'))
	if (w.KitShopPay) return Promise.resolve(w.KitShopPay)
	return new Promise((resolve, reject) => {
		const script = document.createElement('script')
		script.src = url
		script.onload = () => (w.KitShopPay ? resolve(w.KitShopPay) : reject(new Error('Shop Pay could not be loaded')))
		script.onerror = () => {
			script.remove()
			reject(new Error('Shop Pay could not be loaded'))
		}
		document.head.appendChild(script)
	})
}

/** Resolves once Shop Pay's button is on screen. `onClose` runs when the shopper backs out. */
export async function openShopPayCheckout(embed: ShopPayEmbed, onClose: () => void): Promise<void> {
	const client = await loadClient(embed.client_url)
	const mine = ++session
	let locked = false
	let mounted: { destroy: () => void } | undefined

	document.getElementById('shop-pay-overlay')?.remove()
	const overlay = document.createElement('div')
	overlay.id = 'shop-pay-overlay'
	overlay.setAttribute('role', 'dialog')
	overlay.setAttribute('aria-modal', 'true')
	overlay.setAttribute('aria-label', 'Shop Pay')
	overlay.style.cssText =
		'position:fixed;inset:0;z-index:9990;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.5)'
	overlay.innerHTML =
		'<div style="box-sizing:border-box;width:100%;max-width:420px;padding:32px 24px;background:#fff;color:#1a1a1a;border-radius:12px;text-align:center">' +
		'<p style="margin:0 0 20px;line-height:1.5">Finish your payment in Shop Pay’s secure window.</p>' +
		'<div id="shop-pay-button-container" style="display:flex;justify-content:center"></div>' +
		'<p data-msg role="alert" style="min-height:1.5em;margin:12px 0;color:#b00020"></p>' +
		'<button type="button" data-close style="border:0;background:none;color:inherit;text-decoration:underline;cursor:pointer">Choose another payment method</button>' +
		'</div>'
	const message = overlay.querySelector('[data-msg]') as HTMLElement
	const closeButton = overlay.querySelector('[data-close]') as HTMLButtonElement

	const remove = () => {
		overlay.remove()
		window.removeEventListener('popstate', close)
	}
	const close = () => {
		// Once Shop Pay may have charged, the shopper is not sent back to pay again.
		if (locked) return
		locked = true
		mounted?.destroy()
		remove()
		onClose()
	}
	closeButton.addEventListener('click', close)
	window.addEventListener('popstate', close)
	document.body.appendChild(overlay)

	try {
		mounted = await client.mount(embed, {
			container: '#shop-pay-button-container',
			onMessage: (text: string) => {
				if (mine === session) message.textContent = text
			},
			onLock: () => {
				locked = true
				closeButton.style.display = 'none'
			},
			onLeave: (url: string) => {
				if (mine === session) window.location.href = url
			}
		})
	} catch (e) {
		remove()
		throw e
	}
	// Closed while Shop Pay was still loading.
	if (!overlay.isConnected) mounted?.destroy()
	else closeButton.focus()
}
