// Snap Finance's own checkout mark and button (SDK v2), shown over the payment step.
// https://developer.snapfinance.com/sdks
export interface SnapEmbed {
	sdk_url: string
	token: string
	transaction: any
	success_url: string
	failed_url: string
}

const SDK_HOST = 'https://js.snapfinance.com/'
let session = 0

function loadSnapSdk(url: string): Promise<any> {
	const w = window as any
	if (!url.startsWith(SDK_HOST)) return Promise.reject(new Error('Unexpected Snap Finance script'))
	if (w.snap && w.__snapSdkUrl === url) return Promise.resolve(w.snap)
	return new Promise((resolve, reject) => {
		const script = document.createElement('script')
		script.src = url
		script.async = true
		script.onload = () => {
			if (!w.snap) return reject(new Error('Snap Finance could not be loaded'))
			w.__snapSdkUrl = url
			resolve(w.snap)
		}
		script.onerror = () => {
			script.remove()
			reject(new Error('Snap Finance could not be loaded'))
		}
		document.head.appendChild(script)
	})
}

/** Resolves once Snap's button is on screen. `onClose` runs when the shopper backs out. */
export async function openSnapCheckout(embed: SnapEmbed, onClose: () => void): Promise<void> {
	const snap = await loadSnapSdk(embed.sdk_url)
	// The SDK never removes its window listeners, so callbacks of an earlier order
	// still fire. Only the latest session may act on them.
	const mine = ++session
	let done = false
	let launched = false
	const live = () => mine === session && !done

	document.getElementById('snap-checkout-overlay')?.remove()
	const overlay = document.createElement('div')
	overlay.id = 'snap-checkout-overlay'
	overlay.setAttribute('role', 'dialog')
	overlay.setAttribute('aria-modal', 'true')
	overlay.setAttribute('aria-label', 'Snap Finance')
	// Not a <dialog>: its top layer would cover the window Snap opens.
	overlay.style.cssText =
		'position:fixed;inset:0;z-index:9990;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.5)'
	overlay.innerHTML =
		'<div style="box-sizing:border-box;width:100%;max-width:420px;padding:32px 24px;background:#fff;color:#1a1a1a;border-radius:12px;text-align:center">' +
		'<div id="snap-checkout-mark" style="display:flex;justify-content:center"></div>' +
		'<p style="margin:20px 0;line-height:1.5">Apply and sign in Snap’s secure window. Your order is placed once you sign.</p>' +
		'<div id="snap-checkout-button" style="display:flex;justify-content:center"></div>' +
		'<p data-msg role="alert" style="min-height:1.5em;margin:12px 0;color:#b00020"></p>' +
		'<button type="button" data-close style="border:0;background:none;color:inherit;text-decoration:underline;cursor:pointer">Choose another payment method</button>' +
		'</div>'
	const message = overlay.querySelector('[data-msg]') as HTMLElement
	const closeButton = overlay.querySelector('[data-close]') as HTMLButtonElement

	const remove = () => {
		overlay.remove()
		window.removeEventListener('keydown', onKey)
		window.removeEventListener('popstate', close)
	}
	const close = () => {
		if (!live()) return
		done = true
		remove()
		onClose()
	}
	const onKey = (e: KeyboardEvent) => {
		// Once Snap's window is up, Escape belongs to it.
		if (e.key === 'Escape' && !launched) close()
	}
	const leave = (url: string) => {
		if (!live()) return
		done = true
		remove()
		window.location.href = url
	}
	const show = (text: string) => {
		if (!live()) return
		launched = false
		message.textContent = text
	}

	closeButton.addEventListener('click', close)
	window.addEventListener('keydown', onKey)
	window.addEventListener('popstate', close)
	document.body.appendChild(overlay)

	try {
		snap.init(embed.token)
		snap.checkoutMark({ style: { color: 'dark', height: 40 } }).render('snap-checkout-mark')
		snap
			.checkoutButton({
				style: { color: 'dark', shape: 'pill', height: 45 },
				onClick: (_data: any, actions: any) => {
					if (!live()) return
					message.textContent = ''
					launched = true
					return Promise.resolve(actions.launchCheckout(embed.transaction)).catch(() =>
						show('Snap Finance could not be opened. Please try again.')
					)
				},
				onApproved: (data: any) => {
					if (!data?.applicationId) return show('Snap Finance did not return an application. Please contact us.')
					leave(`${embed.success_url}&application_id=${encodeURIComponent(data.applicationId)}`)
				},
				onDenied: () => leave(embed.failed_url),
				onCanceled: () => show('You closed Snap Finance before finishing. You can try again.'),
				// Snap shows the reason in its own window.
				onError: () => show('Snap Finance could not continue. Please try again.')
			})
			.render('snap-checkout-button')
	} catch (e) {
		done = true
		remove()
		throw e
	}
	closeButton.focus()
}
