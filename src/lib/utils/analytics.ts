import { page } from '$app/state'

declare global {
	interface Window {
		gtag?: (...args: any[]) => void
		fbq?: (...args: any[]) => void
	}
}

type AnyRec = Record<string, any>

let cachedIPv4 = ''
let cachedIPv6 = ''
let ipFetched = false

const cleanPhone = (phone: string, defaultCountryCode: string = '44'): string => {
	if (!phone) return ''
	let digits = phone.replace(/\D/g, '')
	if (digits.startsWith('00')) {
		digits = digits.substring(2)
	}
	if (digits.startsWith('0')) {
		digits = digits.substring(1)
	}
	const code = defaultCountryCode.replace(/\D/g, '')
	if (!digits.startsWith(code)) {
		digits = code + digits
	}
	return digits
}

const fetchIPs = () => {
	if (typeof window === 'undefined' || ipFetched) return
	ipFetched = true
	// api64 returns the client's IPv6 when it has one, IPv4 otherwise. Don't call api.ipify /
	// api6.ipify separately: api6 is IPv6-only, so on an IPv4-only network its DNS never resolves
	// and it throws ERR_NAME_NOT_RESOLVED on every page load.
	fetch('https://api64.ipify.org?format=json')
		.then((r) => r.json())
		.then((res) => {
			if (String(res.ip).includes(':')) cachedIPv6 = res.ip
			else cachedIPv4 = res.ip
		})
		.catch(() => {})
}

if (typeof window !== 'undefined') {
	// Deferred to idle: a third-party round trip that Lighthouse put on the critical path at
	// ~3.2s. Nothing regresses — events already fire before the fetch resolves (mergedParams
	// just reads whatever cachedIPv4/v6 hold at send time), so running it at import time bought
	// accuracy we never had, at the cost of LCP bandwidth.
	const idle = window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 2000))
	idle(() => fetchIPs())
}

const hashVal = async (val: string) => {
	if (!val || typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) return ''
	try {
		const msgBuffer = new TextEncoder().encode(val)
		const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer)
		return Array.from(new Uint8Array(hashBuffer))
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('')
	} catch (e) {
		return ''
	}
}

const getDevice = () => {
	if (typeof navigator === 'undefined') return 'desktop'
	const ua = navigator.userAgent
	if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
		return 'tablet'
	}
	if (
		/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
			ua
		)
	) {
		return 'mobile'
	}
	return 'desktop'
}

const getGaSessionId = () => {
	if (typeof document === 'undefined') return ''
	const cookies = document.cookie.split(';')

	const parseSessionId = (valParts: string[]) => {
		let sessionId = valParts[2] || ''
		if (sessionId.includes('$')) {
			sessionId = sessionId.split('$')[0]
		}
		if (sessionId.startsWith('s')) {
			sessionId = sessionId.substring(1)
		}
		return sessionId
	}

	for (let i = 0; i < cookies.length; i++) {
		const cookie = cookies[i].trim()
		if (cookie.startsWith('_ga_')) {
			const parts = cookie.split('=')
			if (parts.length > 1) {
				const val = parts[1]
				const valParts = val.split('.')
				if (valParts.length > 2 && valParts[0].startsWith('GS')) {
					const sessionId = parseSessionId(valParts)
					if (sessionId) return sessionId
				}
			}
		}
	}
	return ''
}

const getAddressDetails = (pageVal: any) => {
	const details = {
		address1: '',
		address2: '',
		city: '',
		state: '',
		country: '',
		zip: ''
	}

	const cartShipping = pageVal?.data?.cart?.shipping_address
	const preSelected = pageVal?.data?.preSelectedAddress
	const firstAddr = pageVal?.data?.myAddresses?.[0]
	const addr = cartShipping || preSelected || firstAddr

	if (addr && (addr.address || addr.city || addr.zip)) {
		const fullAddress = addr.address || addr.addressLine1 || ''
		const lines = fullAddress.split('\n').map((l: string) => l.trim()).filter(Boolean)
		details.address1 = lines[0] || ''
		details.address2 = addr.addressLine2 || lines.slice(1).join(', ') || ''
		details.city = addr.city || ''
		details.state = addr.state || ''
		details.country = addr.country || ''
		details.zip = addr.zip || addr.pincode || ''

		if (typeof window !== 'undefined') {
			try {
				localStorage.setItem('last_known_address', JSON.stringify(details))
			} catch (e) {}
		}
		return details
	}

	if (typeof window !== 'undefined') {
		try {
			const cached = localStorage.getItem('last_known_address')
			if (cached) {
				return JSON.parse(cached)
			}
		} catch (e) {}
	}

	return details
}

export interface TrackOptions {
	googleOnly?: boolean
	fbOnly?: boolean
}

const checkoutFunnelEvents = [
	'begin_checkout',
	'add_payment_info',
	'credit_eligible',
	'purchase',
	'credit_request'
]

export async function track(
	name: string,
	params: AnyRec = {},
	options: TrackOptions = {}
): Promise<void> {
	if (typeof window === 'undefined') return

	const isGoogleOnly = Boolean(options.googleOnly)
	const isFbOnly = Boolean(options.fbOnly)

	const shouldSendGoogle = !isFbOnly
	const shouldSendFb = !isGoogleOnly

	// Smart Deduplication logic
	if (name === 'purchase') {
		const orderId = params.transaction_id || params.orderNo || params.id
		if (orderId) {
			const purchaseKey = `event_fired_purchase_${orderId}`
			if (sessionStorage.getItem(purchaseKey)) {
				return // Prevent duplicate tracking on page refresh for the exact same order
			}
			sessionStorage.setItem(purchaseKey, 'true')
		}
		// Reset checkout step locks so future purchases in the same session track cleanly
		sessionStorage.removeItem('event_fired_begin_checkout')
		sessionStorage.removeItem('event_fired_add_payment_info')
		sessionStorage.removeItem('event_fired_add_shipping_info')
	} else if (checkoutFunnelEvents.includes(name)) {
		const sessionKey = `event_fired_${name}`
		if (sessionStorage.getItem(sessionKey)) {
			return
		}
		sessionStorage.setItem(sessionKey, 'true')
	}

	if (name === 'logout') {
		checkoutFunnelEvents.forEach((evt) => {
			sessionStorage.removeItem(`event_fired_${evt}`)
		})
	}

	const win = window as any
	win.dataLayer = win.dataLayer || []

	const pageVal = page
	const me = pageVal?.data?.me
	const addressInfo = getAddressDetails(pageVal)

	const rawEmail = me?.email || ''
	const rawPhone = cleanPhone(me?.phone || '')

	const [hashedEmail, hashedPhone, hashedFirstName, hashedLastName] = await Promise.all([
		rawEmail ? hashVal(rawEmail.trim().toLowerCase()) : '',
		rawPhone ? hashVal(rawPhone) : '',
		me?.firstName ? hashVal(String(me.firstName).trim().toLowerCase()) : '',
		me?.lastName ? hashVal(String(me.lastName).trim().toLowerCase()) : ''
	])

	const now = new Date()
	const formatDate = (date: Date) => {
		const pad = (n: number) => n.toString().padStart(2, '0')
		return `${pad(date.getHours())}:${pad(date.getMinutes())}`
	}
	const getDayName = (date: Date) =>
		['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()]
	const getMonthName = (date: Date) =>
		[
			'January',
			'February',
			'March',
			'April',
			'May',
			'June',
			'July',
			'August',
			'September',
			'October',
			'November',
			'December'
		][date.getMonth()]

	// Identifying fields go out hashed only. GA4's terms prohibit PII in event parameters and
	// Ads enhanced conversions expects SHA-256, not plaintext, so the plaintext copies were
	// never buying anything.
	//
	// `email` was `hashedEmail || me.email`: hashVal returns '' when crypto.subtle is missing
	// (insecure origin, older browser), so the fallback fired precisely when hashing failed and
	// turned that case into a plaintext leak. An empty field is the correct outcome there.
	// `phone` was always raw and never hashed at all.
	//
	// city/state/country/zip stay in the clear — enhanced conversions accepts them unhashed and
	// they do not identify a person on their own. The street lines are gone; they do.
	const userPayload = me
		? {
				city: addressInfo.city,
				state: addressInfo.state,
				country: addressInfo.country,
				zip: addressInfo.zip,
				hashedEmail,
				hashedPhone,
				hashedFirstName,
				hashedLastName
			}
		: {}

	const mergedParams: AnyRec = {
		...params,
		iPv4: cachedIPv4,
		iPv6: cachedIPv6,
		session_id: getGaSessionId(),
		user_agent: navigator.userAgent,
		device: getDevice(),
		screen_h: window.screen ? window.screen.height : 0,
		screen_w: window.screen ? window.screen.width : 0,
		event_time: formatDate(now),
		event_day: getDayName(now),
		event_month: getMonthName(now),
		...userPayload
	}

	const tagConfig = win.__GOOGLE_TAG_CONFIG__
	const adsSendToList: string[] = []

	if (tagConfig?.active) {
		const conversions = Array.isArray(tagConfig.conversions) ? tagConfig.conversions : []
		const matches = conversions.filter((c: any) => c?.event === name && c?.label?.trim())
		const tagsList: string[] = Array.isArray(tagConfig.tags) ? tagConfig.tags : []
		const adsTag = tagsList.find((t: string) => typeof t === 'string' && t.startsWith('AW-'))

		for (const match of matches) {
			const cleanLabel = match.label.trim()
			if (cleanLabel.includes('/')) {
				adsSendToList.push(cleanLabel)
			} else if (adsTag) {
				adsSendToList.push(`${adsTag}/${cleanLabel}`)
			} else {
				adsSendToList.push(cleanLabel)
			}
		}
	}

	if (shouldSendGoogle) {
		try {
			const g = win.gtag
			if (typeof g === 'function') {
				// 1. Broadcast to all configured tags (GA4 G-XXXX, general AW-XXXX, etc.)
				g('event', name, mergedParams)

				// 2. Fire conversion-specific event(s) to Google Ads if conversion label(s) configured
				for (const sendTo of adsSendToList) {
					g('event', name, {
						...mergedParams,
						send_to: sendTo
					})
				}
			} else {
				win.dataLayer.push({
					event: name,
					...mergedParams
				})
				for (const sendTo of adsSendToList) {
					win.dataLayer.push({
						event: name,
						...mergedParams,
						send_to: sendTo
					})
				}
			}
		} catch {
			/* never let analytics break the app */
		}
	}

	if (shouldSendFb) {
		try {
			if (typeof win.fbq === 'function') {
				const fbEventMap: Record<string, string> = {
					page_view: 'PageView',
					view_item: 'ViewContent',
					add_to_cart: 'AddToCart',
					view_item_list: 'ViewCategory',
					begin_checkout: 'InitiateCheckout',
					add_payment_info: 'AddPaymentInfo',
					purchase: 'Purchase',
					search: 'Search'
				}

				const standardFbEvents = new Set([
					'AddPaymentInfo',
					'AddToCart',
					'AddToWishlist',
					'CompleteRegistration',
					'Contact',
					'CustomizeProduct',
					'Donate',
					'FindLocation',
					'InitiateCheckout',
					'Lead',
					'Purchase',
					'Schedule',
					'Search',
					'StartTrial',
					'SubmitApplication',
					'Subscribe',
					'ViewContent',
					'PageView'
				])

				const fbEvent = fbEventMap[name] || name

				// Auto-extract product context from active page state if not explicitly passed
				const activeProduct = pageVal?.data?.product
				const activeProducts = pageVal?.data?.products?.data || pageVal?.data?.products

				let effectiveItems = params.items
				if (!effectiveItems && activeProduct) {
					effectiveItems = [toItem(activeProduct, params.currency || pageVal?.data?.store?.currencyCode)]
				} else if (!effectiveItems && Array.isArray(activeProducts) && activeProducts.length) {
					effectiveItems = activeProducts
						.slice(0, 40)
						.map((p: AnyRec) => toItem(p, params.currency || pageVal?.data?.store?.currencyCode))
				}

				const contentIds = Array.isArray(effectiveItems)
					? effectiveItems.map((i: any) => i.sku || i.item_id || i.id).filter(Boolean)
					: []
				const numItems = Array.isArray(effectiveItems)
					? effectiveItems.reduce((acc: number, i: any) => acc + (Number(i.quantity) || 1), 0)
					: undefined

				const fbData: AnyRec = {
					...mergedParams,
					...(contentIds.length ? { content_ids: contentIds, content_type: 'product' } : {}),
					...(numItems !== undefined ? { num_items: numItems } : {}),
					...(activeProduct?.name || activeProduct?.title
						? { content_name: activeProduct.name || activeProduct.title }
						: {}),
					...(activeProduct?.category?.name || activeProduct?.category
						? { content_category: activeProduct.category?.name || activeProduct.category }
						: {}),
					...(params.search_term ? { search_string: params.search_term } : {})
				}

				if (standardFbEvents.has(fbEvent)) {
					win.fbq('track', fbEvent, fbData)
				} else {
					win.fbq('trackCustom', fbEvent, fbData)
				}
			}
		} catch {
			/* never let fbq break the app */
		}
	}
}

function toItem(p: AnyRec, currency?: string): AnyRec {
	return {
		item_id: p?.sku ?? p?.id ?? p?._id,
		item_name: p?.title ?? p?.name,
		item_brand: p?.brandName ?? p?.brand?.name,
		item_category: p?.category?.name ?? p?.category,
		price: p?.price,
		quantity: p?.qty ?? 1,
		...(currency ? { currency } : {})
	}
}

export async function trackViewItem(product: AnyRec | undefined, currency?: string, options?: TrackOptions): Promise<void> {
	if (!product) return
	await Promise.all([
		track('view_item', { currency, value: product.price, items: [toItem(product, currency)] }, options),
		track('page_view', {
			currency,
			value: product.price,
			items: [toItem(product, currency)]
		}, { fbOnly: true })
	])
}

export async function trackAddToCart(product: AnyRec | undefined, qty = 1, currency?: string, options?: TrackOptions): Promise<void> {
	if (!product) return
	await track('add_to_cart', {
		currency,
		value: (product.price ?? 0) * (qty || 1),
		items: [toItem({ ...product, qty: qty || 1 }, currency)]
	}, options)
}

export async function trackRemoveFromCart(product: AnyRec | undefined, qty = 1, currency?: string, options?: TrackOptions): Promise<void> {
	if (!product) return
	await track('remove_from_cart', {
		currency,
		value: (product.price ?? 0) * (qty || 1),
		items: [toItem({ ...product, qty: qty || 1 }, currency)]
	}, options)
}

export async function trackViewItemList(products: AnyRec[] = [], listName?: string, currency?: string, options?: TrackOptions): Promise<void> {
	if (!products?.length) return
	await Promise.all([
		track('view_item_list', {
			item_list_name: listName,
			items: products.slice(0, 30).map((p) => toItem(p, currency))
		}, options),
		track('page_view', {
			item_list_name: listName,
			items: products.slice(0, 30).map((p) => toItem(p, currency))
		}, { fbOnly: true })
	])
}

export async function trackBeginCheckout(cart: AnyRec | undefined, currency?: string, options?: TrackOptions): Promise<void> {
	if (!cart?.lineItems?.length) return
	await track('begin_checkout', {
		currency,
		value: cart.total,
		coupon: cart.couponCode,
		items: cart.lineItems.map((p: AnyRec) => toItem(p, currency))
	}, options)
}

export async function trackPurchase(order: AnyRec | undefined, currency?: string, options?: TrackOptions): Promise<void> {
	if (!order) return
	await track('purchase', {
		transaction_id: order.orderNo ?? order.id,
		value: order.amount?.total ?? order.total,
		tax: order.tax ?? order.amount?.tax,
		shipping: order.amount?.shipping ?? order.shippingRate?.amount,
		currency,
		coupon: order.coupon?.code,
		items: (order.lineItems ?? []).map((p: AnyRec) => toItem(p, currency))
	}, options)
}

export async function trackSearch(term: string, options?: TrackOptions): Promise<void> {
	if (!term?.trim()) return
	await track('search', { search_term: term.trim() }, options)
}

export async function trackSelectItem(product: AnyRec | undefined, listName?: string, currency?: string, options?: TrackOptions): Promise<void> {
	if (!product) return
	await track('select_item', { item_list_name: listName, items: [toItem(product, currency)] }, options)
}

export async function trackViewCart(cart: AnyRec | undefined, currency?: string, options?: TrackOptions): Promise<void> {
	if (!cart?.lineItems?.length) return
	await Promise.all([
		track('view_cart', {
			currency,
			value: cart.total,
			items: cart.lineItems.map((p: AnyRec) => toItem(p, currency))
		}, options),
		track('page_view', {
			currency,
			value: cart.total,
			items: cart.lineItems.map((p: AnyRec) => toItem(p, currency))
		}, { fbOnly: true })
	])
}

export async function trackAddShippingInfo(cart: AnyRec | undefined, shippingTier?: string, currency?: string, options?: TrackOptions): Promise<void> {
	if (!cart?.lineItems?.length) return
	await track('add_shipping_info', {
		currency,
		value: cart.total,
		coupon: cart.couponCode,
		shipping_tier: shippingTier,
		items: cart.lineItems.map((p: AnyRec) => toItem(p, currency))
	}, options)
}

export async function trackAddPaymentInfo(cart: AnyRec | undefined, paymentType?: string, currency?: string, options?: TrackOptions): Promise<void> {
	if (!cart?.lineItems?.length) return
	await track('add_payment_info', {
		currency,
		value: cart.total,
		coupon: cart.couponCode,
		payment_type: paymentType,
		items: cart.lineItems.map((p: AnyRec) => toItem(p, currency))
	}, options)
}

export async function trackPageView(customParams: AnyRec = {}, options?: TrackOptions): Promise<void> {
	await track('page_view', customParams, options)
}

