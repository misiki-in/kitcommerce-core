// Declare gtag as a global function
declare global {
	interface Window {
		gtag: (...args: any[]) => void
	}
}

import { page } from '$app/state'

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
	// Deferred to idle: a third-party round trip Lighthouse put on the critical path. Nothing
	// regresses — events already fire before it resolves (mergedParams reads whatever
	// cachedIPv4/v6 hold at send time).
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

	// Scan all matching _ga_ cookies generically
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

// Identity fields that must never reach GA4 as plaintext. Used by the default switch branch,
// which forwards caller-supplied objects verbatim.
const PII_KEYS = ['email', 'phone', 'firstName', 'lastName', 'name', 'user_email', 'user_name', 'retailer_email']

const stripPii = (data: any) =>
	data && typeof data === 'object' && !Array.isArray(data)
		? Object.fromEntries(Object.entries(data).filter(([k]) => !PII_KEYS.includes(k)))
		: data

export const fireGTagEvent = async (event_name: string, data: any) => {
	const checkoutFunnelEvents = ['begin_checkout', 'add_payment_info', 'credit_eligible', 'purchase', 'credit_request']
	if (typeof window !== 'undefined' && checkoutFunnelEvents.includes(event_name)) {
		const sessionKey = `event_fired_${event_name}`
		if (sessionStorage.getItem(sessionKey)) {
			return
		}
		sessionStorage.setItem(sessionKey, 'true')
	}

	if (event_name === 'logout' && typeof window !== 'undefined') {
		checkoutFunnelEvents.forEach((event) => {
			sessionStorage.removeItem(`event_fired_${event}`)
		})
	}

	// Shadow window.gtag
	const gtag = async (action: string, name: string, payload: any) => {
		if (typeof window === 'undefined') return
		// @ts-ignore
		const actualGtag = window.gtag
		if (typeof actualGtag !== 'function') return

		const pageVal = page
		const me = pageVal?.data?.me

		const addressInfo = getAddressDetails(pageVal)

		let hashedEmail = ''
		let hashedPhone = ''
		let hashedFirstName = ''
		let hashedLastName = ''
		const email = me?.email || ''
		const phone = cleanPhone(me?.phone || '')

		if (email) {
			hashedEmail = await hashVal(email.trim().toLowerCase())
		}
		if (phone) {
			hashedPhone = await hashVal(phone)
		}
		if (me?.firstName) {
			hashedFirstName = await hashVal(String(me.firstName).trim().toLowerCase())
		}
		if (me?.lastName) {
			hashedLastName = await hashVal(String(me.lastName).trim().toLowerCase())
		}

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
		const userPayload = me ? {
			city: addressInfo.city,
			state: addressInfo.state,
			country: addressInfo.country,
			zip: addressInfo.zip,
			hashedEmail,
			hashedPhone,
			hashedFirstName,
			hashedLastName
		} : {}

		const enrichedPayload = {
			...payload,
			iPv4: cachedIPv4,
			iPv6: cachedIPv6,
			'session_id': getGaSessionId(),
			'user_agent': navigator.userAgent,
			device: getDevice(),
			'screen_h': window.screen ? window.screen.height : 0,
			'screen_w': window.screen ? window.screen.width : 0,
			...userPayload
		}
		;(actualGtag as any)(action, name, enrichedPayload)
	}

	let items

	const formatDate = (date: Date) => {
		const padZero = (num: number) => num.toString().padStart(2, '0')
		return `${padZero(date.getHours())}:${padZero(date.getMinutes())}`
	}

	const getDayOfWeek = (date: Date) =>
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

	const now = new Date()

	const eventTime = formatDate(now)
	const eventDay = getDayOfWeek(now)
	const eventMonth = getMonthName(now)

	const currencyCode = page?.data?.store?.currency?.code || 'GBP'

	if (!data) data = {}
	data.items = data.items || []
	items = data.items.map((item: any, idx: number) => {
		if (!item) return
		item.discount = item?.discount || item?.coupon || {}
		return {
			item_id: item.sku ? item.sku : item._id,
			item_name: item.name,
			affiliation: item.vendorBusinessName || item.vendor?.BusinessName || item.vendor?.business_name,
			item_brand: item.brandName,
			item_category: item.category?.name || item.category || item.item_category,
			item_category2: item.item_category2,
			item_category3: item.item_category3,
			item_category4: item.item_category4,
			item_category5: item.item_category5,
			price: item.price,
			quantity: item.qty,
			coupon: item.discount?.code,
			currency: currencyCode,
			discount: item.discount?.amount,
			savings: item.savings,
			index: idx
		}
	})

	if (event_name == 'view_item') {
		items = {
			item_id: data.sku ? data.sku : (data._id || data.id),
			item_name: data.name || data.title,
			affiliation: data.vendor?.BusinessName || data.vendorBusinessName || data.vendor?.business_name,
			item_brand: data.brand?.name,
			item_category: data.categoryPool?.[0]?.name || data.category?.name,
			item_category2: data.categoryPool?.[1]?.name,
			item_category3: data.categoryPool?.[2]?.name,
			item_category4: data.categoryPool?.[3]?.name,
			item_category5: data.categoryPool?.[4]?.name,
			price: data.price,
			quantity: data.qty,
			currency: currencyCode,
			index: 0
		}
	}

	if (event_name == 'view_item_list') {
		items = data.items.map((item: any) => {
			item.discount = item.discount || item.coupon || {}
			return {
				item_id: item.sku ? item.sku : (item._id || item.id),
				item_name: item.name || item.title,
				affiliation: item.vendorBusinessName,
				item_brand: item.brandName,
				item_category: item.category?.name,
				price: item.price,
				quantity: item.qty,
				coupon: item.discount?.code,
				currency: currencyCode,
				discount: item.discount?.amount,
				savings: item.savings,
				index: 0
			}
		})
	}

	if (gtag) {
		switch (event_name) {
			case 'add_to_cart':
				// @ts-ignore
				await gtag('event', 'add_to_cart', {
					currency: currencyCode,
					value: data.total,
					quantity: data.qty,
					affiliation: data.vendorBusinessName || data.vendor?.BusinessName || data.vendor?.business_name,
					items,
					user_id: data.user?.id || data.user?._id,
					vendor_id: data.vendor?.id || data.vendor?._id || data.retailer?.id,
					vendor_name: data.vendor?.name || data.vendorBusinessName || data.vendor?.business_name || data.vendor?.BusinessName || data.retailer?.name,
					vendor_email: data.vendor?.email || data.retailer?.email,
					event_time: eventTime,
					event_day: eventDay,
					event_month: eventMonth
				})
				break

			case 'view_cart':
				// @ts-ignore
				await gtag('event', 'view_cart', {
					currency: currencyCode,
					value: data.total,
					items,
					event_time: eventTime,
					event_day: eventDay,
					event_month: eventMonth
				})
				break

			case 'view_item':
				// @ts-ignore
				await gtag('event', 'view_item', {
					currency: currencyCode,
					value: data.price,
					items,
					event_time: eventTime,
					event_day: eventDay,
					event_month: eventMonth
				})
				break

			case 'view_item_list':
				// @ts-ignore
				await gtag('event', 'view_item_list', {
					currency: currencyCode,
					item_list_id: data.category_id,
					item_list_name: data.category_name,
					total_items_id: [`${data.items.map((item: any) => `'${item._id || item.id}'`)}`],
					items,
					event_time: eventTime,
					event_day: eventDay,
					event_month: eventMonth
				})
				break

			case 'remove_from_cart':
				// @ts-ignore
				await gtag('event', 'remove_from_cart', {
					currency: currencyCode,
					value: data.price,
					items,
					affiliation: data.vendorBusinessName || data.vendor?.BusinessName || data.vendor?.business_name,
					event_time: eventTime,
					event_day: eventDay,
					event_month: eventMonth
				})
				break

			case 'begin_checkout':
				const beginCheckoutData = {
					currency: currencyCode,
					value: data.total,
					items,
					affiliation: data.brand_name,
					user_id: data.user?.id || data.user?._id,
					vendor_id: data.vendor?.id || data.vendor?._id || data.retailer?.id,
					vendor_name: data.vendor?.name || data.vendorBusinessName || data.vendor?.business_name || data.vendor?.BusinessName || data.retailer?.name,
					vendor_email: data.vendor?.email || data.retailer?.email,
					event_time: eventTime,
					event_day: eventDay,
					event_month: eventMonth
				}
				// @ts-ignore
				await gtag('event', 'begin_checkout', beginCheckoutData)
				break

			case 'add_payment_info':
				// @ts-ignore
				await gtag('event', 'add_payment_info', {
					currency: currencyCode,
					value: data.total,
					shipping: data.shipping?.charge,
					items,
					user_id: data.user?.id || data.user?._id,
					vendor_id: data.vendor?.id || data.vendor?._id || data.retailer?.id,
					vendor_name: data.vendor?.name || data.vendorBusinessName || data.vendor?.business_name || data.vendor?.BusinessName || data.retailer?.name,
					vendor_email: data.vendor?.email || data.retailer?.email,
					event_time: eventTime,
					event_day: eventDay,
					event_month: eventMonth
				})
				break

			case 'search':
				// @ts-ignore
				await gtag('event', 'search', {
					search_term: data.search_term
				})
				break

			case 'purchase':
				// @ts-ignore
				await gtag('event', 'purchase', {
					transaction_id: data.orderNo,
					affiliation: items[0]?.vendorBusinessName || items[0]?.vendor?.BusinessName || items[0]?.vendor?.business_name,
					value: data.amount?.total,
					tax: data.tax,
					shipping: data.amount?.shipping,
					currency: currencyCode,
					coupon: data.coupon?.code,
					items,
					user_id: data.user?.id || data.user?._id,
					vendor_id: data.vendor?.id || data.vendor?._id || data.retailer?.id,
					vendor_name: data.vendor?.name || data.vendorBusinessName || data.vendor?.business_name || data.vendor?.BusinessName || data.retailer?.name,
					vendor_email: data.vendor?.email || data.retailer?.email,
					credit_opted: data.credit_opted,
					event_time: eventTime,
					event_day: eventDay,
					event_month: eventMonth
				})
				break

			case 'credit_request':
				// @ts-ignore
				await gtag('event', 'credit_request', {
					currency: currencyCode,
					company_id: data.company_id,
					company_name: data.company_name,
					credit: data.credit,
					event_time: eventTime,
					event_day: eventDay,
					event_month: eventMonth
				})
				break

			case 'add_shipping_info':
				// @ts-ignore
				await gtag('event', 'add_shipping_info', {
					currency: currencyCode,
					value: data.value || data.total,
					shipping_tier: data.shipping_tier,
					items,
					event_time: eventTime,
					event_day: eventDay,
					event_month: eventMonth
				})
				break

			case 'checkout_error':
				// @ts-ignore
				await gtag('event', 'checkout_error', {
					error_message: data.error_message,
					checkout_step: data.checkout_step,
					event_time: eventTime,
					event_day: eventDay,
					event_month: eventMonth
				})
				break

			case 'contact':
				// @ts-ignore
				await gtag('event', 'contact', {
					contact_method: data.contact_method,
					event_time: eventTime,
					event_day: eventDay,
					event_month: eventMonth
				})
				break

			default:
				// Unmapped events pass `data` straight through, and callers do hand it whole
				// objects — `fireGTagEvent('logout', userState.user)` in use-nav sends the entire
				// user record. Scrub identity fields here so an unmapped event cannot leak what
				// the mapped ones are careful about.
				// @ts-ignore
				await gtag('event', event_name, stripPii(data))
				break
		}
	}
}
