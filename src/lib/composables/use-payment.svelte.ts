import { getCartState } from '$lib/stores/index.js'
import { onMount } from 'svelte'
import { goto } from '$app/navigation'
import { toast } from 'svelte-sonner'
import { checkoutService, couponService, paymentMethodService } from '$lib/services/index.js'
import { browser } from '$app/environment'
import { page } from '$app/state'
import { appendOneTimeCartId, injectAffirm } from '$lib/utils/index.js'
import { fireGTagEvent } from '$lib/utils/gtag.js'
import { TraceBox } from '@ayushtripathy/tracebox'
import { env } from '$env/dynamic/public'

// Define interfaces for better type safety
interface Cart {
	id: string
	name?: string
	phone?: string
	email?: string
	paymentMethod?: string | null
	shippingAddress?: {
		name?: string
		phone?: string
		email?: string
		country?: string
		countryCode?: string
	}
	shippingAddressId?: string
	// Index signature to allow additional properties
	[prop: string]: unknown
}

interface CartState {
	cart: Cart
	removeCoupon: () => void
	setShippingRate: (params: { shippingRateId: string }) => Promise<void>
	createSingleItemCheckoutSession: (params: { productId: string; variantId: string; qty: number }) => Promise<void>
	restorePrevCart: () => Promise<void>
	setSelectedPaymentMethod?: (code: string) => Promise<void> | void
}

interface PaymentMethod {
	img: any
	name: string
	code: string
	apiKey?: string
	isTest?: boolean
	description?: string
	badges?: string[]
}

// Declare affirm as global
declare global {
	interface Window {
		Razorpay: any
		affirm: any
		Cashfree: any
	}
	const affirm: any
	const Cashfree: any
}

const trace = new TraceBox({
  projectSlug: "jewelwesell",
  apiKey: env.PUBLIC_TRACEBOX_KEY || "test"
});

export class PaymentModule {
  static _instance: PaymentModule

	cartState = getCartState() as CartState
	selectedPGCode = $state('')

	get SELECTED_PG_CODE(): string {
		return this.selectedPGCode
	}

	set SELECTED_PG_CODE(value: string | undefined) {
		this.selectedPGCode = value || ''
    if (value)
      this.checkoutDisabled = false
	}

	// Helper method to safely get uppercase payment code
	private getPaymentCode(): string {
		const code = this.SELECTED_PG_CODE
		if (!code) return ''
		return typeof code.toUpperCase === 'function' ? code.toUpperCase() : String(code).toUpperCase()
	}

	paymentLoader = $state(false)
	loadingForCart = $state(false)
  loadingForPaymentMethods = $state(true)
	payment_sessions = []
	editAddress = $state(false)
	razorpayReady = $state(false)
	affirmReady = $state(false)
	cashfreeReady = $state(false)
	order_no = $state('')
	showError = $state(false)
	errorMessage = $state('')
	checkoutDisabled = $state(true)
	showPaymentMethods = $state(false)
	couponCode = $state('')
	showCouponInput = $state(false)
	coupons = $state<any>([])
	shippingRates = $state({})
	affirmPaymentMethod: PaymentMethod | null = null
  isPhoneRequired = $derived(page.data?.store?.isPhoneMandatory)
	isEmailRequired = $derived(page.data?.store?.isEmailMandatory)
  isCheckoutDisabled = $derived(this.checkoutDisabled || (this.isPhoneRequired && !this.cartState?.cart?.phone) || (this.isEmailRequired && !this.cartState?.cart?.email) || !this.cartState?.cart?.shippingAddress || !this.cartState?.cart?.shippingAddressId)

  allPaymentMethods: PaymentMethod[] = $state([])
  listOfPaymentMethods: PaymentMethod[] = $derived.by(() => {
    const shippingAddress = this.cartState?.cart?.shippingAddress
    let methods = this.allPaymentMethods

    if (shippingAddress && shippingAddress.country !== 'USA' && shippingAddress.countryCode !== 'US') {
      methods = methods.filter((method: PaymentMethod) => {
        const code = method?.code?.toUpperCase?.()
        return code !== 'AFFIRMPAY' && code !== 'AFFIRM_PAY'
      })
    }

    // Filter out payment methods whose external SDKs are not ready yet
    return methods.filter((method: PaymentMethod) => {
      const code = method?.code?.toUpperCase?.()
      if (code === 'RAZORPAY') return this.razorpayReady
      if (code === 'AFFIRMPAY' || code === 'AFFIRM_PAY') return this.affirmReady
      if (code === 'CASHFREE') return this.cashfreeReady
      return true
    })
  })

	constructor() {
		onMount(async () => {
			if (browser) {
        this.loadingForPaymentMethods = true
				const allPaymentMethods: any = await paymentMethodService.list({})
				this.allPaymentMethods = allPaymentMethods?.data || []
        this.loadingForPaymentMethods = false

        const shippingAddress = this.cartState?.cart?.shippingAddress
				if (this.allPaymentMethods.length === 0) {
					this.showError = true
					this.errorMessage = 'No payment methods available'
					this.checkoutDisabled = true
				} else {
					const savedCode = this.cartState?.cart?.paymentMethod as string | undefined
					if (savedCode) {
						const exists = this.allPaymentMethods.some((m: PaymentMethod) => m?.code?.toUpperCase?.() === savedCode.toUpperCase())
						if (exists) {
							this.SELECTED_PG_CODE = savedCode
						}
					}

					if (!this.SELECTED_PG_CODE && this.allPaymentMethods.length === 1) {
						const singleMethod = this.allPaymentMethods[0]
						if (singleMethod?.code) {
							this.SELECTED_PG_CODE = singleMethod.code
						}
					}
					this.showPaymentMethods = true
				}
				if (this.allPaymentMethods.find((f: PaymentMethod) => f?.code?.toUpperCase?.() === 'RAZORPAY')) {
					const razorpayScript = document.createElement('script')
					razorpayScript.src = 'https://checkout.razorpay.com/v1/checkout.js'
					razorpayScript.async = true
					razorpayScript.onload = () => {
						setTimeout(() => {
							this.razorpayReady = true
						}, 500)
					}
					document.head.appendChild(razorpayScript)
				}
				this.affirmPaymentMethod = this.allPaymentMethods.find((f: PaymentMethod) => f?.code?.toUpperCase?.() === 'AFFIRMPAY' || f?.code?.toUpperCase?.() === 'AFFIRM_PAY') || null
        if (this.affirmPaymentMethod) {
					if (shippingAddress?.country === 'USA' || shippingAddress?.countryCode === 'US' || !shippingAddress) {
						injectAffirm(this.affirmPaymentMethod.apiKey, this.affirmPaymentMethod.isTest)
							.then(() => {
								this.affirmReady = true
							})
							.catch(() => {
								this.affirmReady = false
							})
					}
				}
				if (this.allPaymentMethods.find((f: PaymentMethod) => f?.code?.toUpperCase?.() === 'CASHFREE')) {
					this.loadCashfreeScript()
						.then(() => {
							this.cashfreeReady = true
						})
						.catch(() => {
							this.cashfreeReady = false
						})
				}
				try {
					const res: any = await couponService.listCoupons({})
					if (res?.count > 0) {
						this.showCouponInput = true
						this.coupons = res?.data || []
					}
				} catch (e: any) {
					toast.error(e.message)
				} finally {
				}
			}
		})

		$effect(() => {
			if (this.cartState?.cart?.id) {
				this.getShippingRates(this.cartState.cart.id)
			}
		})
	}

	removeAppliedCoupon = () => {
		this.cartState?.removeCoupon()
	}

		placeOrder = async () => {
		if (!this.SELECTED_PG_CODE) {
			toast.error('Please select a payment method')
			try {
				fireGTagEvent('checkout_error', { error_message: 'Please select a payment method', checkout_step: 'payment' })
			} catch (err) {
				console.warn('Analytics error:', err)
			}
			return
		}

		const origin = typeof window !== 'undefined' ? window.location.origin : (page?.url?.origin || '')
		const cartId = this.cartState?.cart?.id || (typeof window !== 'undefined' ? localStorage.getItem('cart_id') : '') || ''

		if (!cartId) {
			toast.error('Cart is missing or empty')
			return
		}

		try {
			fireGTagEvent('add_payment_info', {
				total: this.cartState?.cart?.total || 0,
				shipping: { charge: this.cartState?.cart?.shippingRate },
				items: this.cartState?.cart?.lineItems || [],
				retailer: {
					id: page?.data?.storeId || page?.data?.store?.id,
					name: page?.data?.store?.name,
					email: page?.data?.store?.email
				}
			})
		} catch (err) {
			console.warn('Analytics error:', err)
		}

		this.paymentLoader = true
		try {
			const pgCode = this.getPaymentCode()

			if (pgCode === 'RAZORPAY') {
				if (!this.razorpayReady || typeof window.Razorpay === 'undefined') {
					toast.error('Please wait till payment gateway is ready')
					this.paymentLoader = false
				} else {
					const rp: any = await checkoutService.checkoutRazorpay({
						cartId,
						origin
					})
					this.order_no = rp?.order_no || ''
					if (rp && rp !== null) {
						const options = {
							key: rp.key_id,
							description: `Order #${this.order_no}`,
							amount: rp.amount,
							order_id: rp.id,
							async handler(response: any) {
								try {
									const capture: any = await checkoutService.captureRazorpayPayment({
										razorpay_order_id: response.razorpay_order_id,
										razorpay_payment_id: response.razorpay_payment_id
									})
									goto(`/checkout/process?pg=razorpay&order_no=${capture?.order_no}&cart_id=${cartId}`)
								} catch (e: any) {
									toast.error(e.message)
								}
							},
							prefill: {
								name: this.cartState?.cart?.name || this.cartState?.cart?.shippingAddress?.name || page?.data?.store?.businessEmail || '',
								contact: this.cartState?.cart?.phone || this.cartState?.cart?.shippingAddress?.phone || page?.data?.store?.businessPhone || '',
								email: this.cartState?.cart?.email || this.cartState?.cart?.shippingAddress?.email || ''
							}
						}

						if (typeof window.Razorpay === 'undefined') {
							toast.error('Payment gateway is not ready yet')
							this.paymentLoader = false
							return
						}
						const rzp1 = new window.Razorpay(options)
						rzp1.open()
					} else {
						toast.error('Something went wrong')
						this.paymentLoader = false
					}
				}
			} else if (pgCode === 'AFFIRMPAY' || pgCode === 'AFFIRM_PAY') {
				let affirmObj = typeof window !== 'undefined' ? (window as any).affirm : (typeof affirm !== 'undefined' ? affirm : null)

				// If Affirm SDK is not yet initialized or ready, attempt to load and initialize it on the fly
				if (!affirmObj || typeof affirmObj.checkout !== 'function') {
					if (this.affirmPaymentMethod?.apiKey) {
						try {
							await injectAffirm(this.affirmPaymentMethod.apiKey, this.affirmPaymentMethod.isTest)
							this.affirmReady = true
							affirmObj = typeof window !== 'undefined' ? (window as any).affirm : (typeof affirm !== 'undefined' ? affirm : null)
							await trace.capture(
								{ isTest: this.affirmPaymentMethod?.isTest },
								'core-affirm-dynamic-inject-success',
								{
									label: 'core-affirm-dynamic-injected',
									metadata: {
										environment: process.env.NODE_ENV || 'production',
										storeId: String(page?.data?.storeId || page?.data?.store?.id || ''),
										cartId: String(cartId || '')
									}
								}
							)
						} catch (err: any) {
							console.warn('Failed to dynamically inject Affirm script:', err)
							await trace.capture(
								{ error: err?.message || String(err) },
								'core-affirm-dynamic-inject-error',
								{
									label: 'core-affirm-dynamic-inject-failed',
									metadata: {
										environment: process.env.NODE_ENV || 'production',
										storeId: String(page?.data?.storeId || page?.data?.store?.id || ''),
										cartId: String(cartId || '')
									}
								}
							)
						}
					}
				}

				if (!affirmObj || typeof affirmObj.checkout !== 'function') {
					await trace.capture(
						{ affirmReady: this.affirmReady, hasAffirmObj: !!affirmObj },
						'core-affirm-not-ready',
						{
							label: 'core-affirm-not-ready',
							metadata: {
								environment: process.env.NODE_ENV || 'production',
								storeId: String(page?.data?.storeId || page?.data?.store?.id || ''),
								cartId: String(cartId || '')
							}
						}
					)
					toast.error('Affirm is not ready yet, please try reloading the page.')
					this.paymentLoader = false
					return
				}

				if (affirmObj.ui?.error?.on && typeof affirmObj.ui.error.on === 'function') {
					try {
						affirmObj.ui.error.on('close', async () => {
							this.paymentLoader = false
							await trace.capture(
								{},
								'core-affirm-modal-error-closed',
								{
									label: 'core-affirm-ui-error-close',
									metadata: {
										environment: process.env.NODE_ENV || 'production',
										storeId: String(page?.data?.storeId || page?.data?.store?.id || ''),
										cartId: String(cartId || '')
									}
								}
							)
						})
					} catch (err) {
						console.warn('Could not attach Affirm error close listener:', err)
					}
				}

				let affirmPayOrder: any
				try {
					affirmPayOrder = await checkoutService.createAffirmPayOrder({
						cartId,
						addressId: this.cartState?.cart?.shippingAddressId ?? '',
						origin,
						storeId: page?.data?.storeId || page?.data?.store?.id,
						paymentMethodId: 'AffirmPay'
					})

					await trace.capture(
						affirmPayOrder,
						'core-affirm-create-order-response',
						{
							label: 'core-affirm-create-order-success',
							metadata: {
								environment: process.env.NODE_ENV || 'production',
								storeId: String(page?.data?.storeId || page?.data?.store?.id || ''),
								orderId: String(affirmPayOrder?.order_id || affirmPayOrder?.id || ''),
								cartId: String(cartId || '')
							}
						}
					)
				} catch (orderCreateErr: any) {
					await trace.capture(
						{
							error: orderCreateErr?.message || String(orderCreateErr),
							stack: orderCreateErr?.stack
						},
						'core-affirm-create-order-error',
						{
							label: 'core-affirm-create-order-failed',
							metadata: {
								environment: process.env.NODE_ENV || 'production',
								storeId: String(page?.data?.storeId || page?.data?.store?.id || ''),
								cartId: String(cartId || '')
							}
						}
					)
					throw orderCreateErr
				}

				if (this.affirmPaymentMethod?.apiKey && affirmPayOrder?.merchant) {
					affirmPayOrder.merchant.public_api_key = this.affirmPaymentMethod.apiKey
				}
				if (affirmPayOrder) {
					affirmPayOrder.currency = 'USD'
				}

				try {
					affirmObj.checkout(affirmPayOrder)
					await trace.capture(
						{
							order: affirmPayOrder,
							checkoutData: affirmObj.checkout?.data || affirmObj.checkout?._data || null,
							isReady: affirmObj.checkout?.isReady ?? null,
							currentProduct: affirmObj.checkout?.currentProduct ?? null,
							config: affirmObj.config || null,
							uiState: affirmObj.ui?.state || null
						},
						'core-affirm-checkout-response',
						{
							label: 'core-affirm-checkout-success',
							metadata: {
								environment: process.env.NODE_ENV || 'production',
								storeId: String(page?.data?.storeId || page?.data?.store?.id || ''),
								orderId: String(affirmPayOrder?.order_id || affirmPayOrder?.id || ''),
								cartId: String(cartId || '')
							}
						}
					)
				} catch (checkoutErr: any) {
					await trace.capture(
						{
							error: checkoutErr?.message || String(checkoutErr),
							stack: checkoutErr?.stack,
							order: affirmPayOrder,
							checkoutData: affirmObj.checkout?.data || affirmObj.checkout?._data || null,
							isReady: affirmObj.checkout?.isReady ?? null
						},
						'core-affirm-checkout-init-error',
						{
							label: 'core-affirm-checkout-init-failed',
							metadata: {
								environment: process.env.NODE_ENV || 'production',
								storeId: String(page?.data?.storeId || page?.data?.store?.id || ''),
								orderId: String(affirmPayOrder?.order_id || affirmPayOrder?.id || ''),
								cartId: String(cartId || '')
							}
						}
					)
					throw checkoutErr
				}

				const self = this
				affirmObj.checkout.open({
					onOpen: async (checkoutAri: any) => {
						await trace.capture(
							{
								checkoutAri,
								order: affirmPayOrder,
								checkoutData: affirmObj.checkout?.data || affirmObj.checkout?._data || null
							},
							'core-affirm-modal-opened',
							{
								label: 'core-affirm-modal-opened-success',
								metadata: {
									environment: process.env.NODE_ENV || 'production',
									storeId: String(page?.data?.storeId || page?.data?.store?.id || ''),
									orderId: String(affirmPayOrder?.order_id || affirmPayOrder?.id || ''),
									checkoutAri: String(checkoutAri || '')
								}
							}
						)
					},
					onValidationError: async (validationError: any) => {
						self.paymentLoader = false
						await trace.capture(
							validationError || {},
							'core-affirm-checkout-validation-error',
							{
								label: 'core-affirm-checkout-validation-failed',
								metadata: {
									environment: process.env.NODE_ENV || 'production',
									storeId: String(page?.data?.storeId || page?.data?.store?.id || ''),
									orderId: String(affirmPayOrder?.order_id || affirmPayOrder?.id || ''),
									cartId: String(cartId || '')
								}
							}
						)
					},
					onFail: async (error: any) => {
						self.paymentLoader = false
						toast.error('Affirm Payment Failed')
						await trace.capture(
							error || {},
							'core-affirm-checkout-onfail',
							{
								label: 'core-affirm-checkout-failed',
								metadata: {
									environment: process.env.NODE_ENV || 'production',
									storeId: String(page?.data?.storeId || page?.data?.store?.id || ''),
									orderId: String(affirmPayOrder?.order_id || affirmPayOrder?.id || ''),
									cartId: String(cartId || '')
								}
							}
						)
						await checkoutService.cancelAffirmOrder({
							orderId: affirmPayOrder?.order_id || '',
							storeId: page?.data?.storeId || page?.data?.store?.id,
							origin
						})
					},
					onSuccess: async (success_object: any) => {
						try {
							const response1: any = await checkoutService.confirmAffirmOrder({
								affirmToken: success_object?.checkout_token,
								orderId: affirmPayOrder?.order_id || '',
								storeId: page?.data?.store?.id,
								origin,
								return_url: `${origin}/checkout/success`
							})

							await trace.capture(
								response1,
								"core-affirm-api-charge-response",
								{
									label: "core-affirm-charge-success",
									metadata: {
										environment: process.env.NODE_ENV || "production",
										storeId: String(page?.data?.storeId || page?.data?.store?.id || ""),
										orderId: String(affirmPayOrder?.order_id || ""),
										affirmTransactionId: String(response1?.data?.id || ""),
                    successObject: success_object
									}
								}
							)

							goto(`/checkout/success?order_no=${affirmPayOrder?.order_id || ''}&status=PAYMENT_SUCCESS&provider=AffirmPay`)
						} catch (e: any) {
							await trace.capture(
								{ error: e?.message || String(e), stack: e?.stack, successObject: success_object },
								'core-affirm-api-charge-error',
								{
									label: 'core-affirm-charge-failed',
									metadata: {
										environment: process.env.NODE_ENV || 'production',
										storeId: String(page?.data?.storeId || page?.data?.store?.id || ''),
										orderId: String(affirmPayOrder?.order_id || affirmPayOrder?.id || ''),
										affirmToken: String(success_object?.checkout_token || '')
									}
								}
							)
							toast.error(e.message || 'Failed to confirm Affirm order')
						} finally {
							self.paymentLoader = false
						}
					}
				})
			} else if (pgCode === 'PHONEPE') {
				const pp: any = await checkoutService.checkoutPhonepe({
					cartId,
					email: this.cartState?.cart?.email,
					phone: this.cartState?.cart?.phone || this.cartState?.cart?.shippingAddress?.phone || '',
					origin
				})
				if (pp?.redirectUrl) {
					window.location.href = pp.redirectUrl
				} else {
					toast.error('Something went wrong with PhonePe')
					this.paymentLoader = false
				}
			} else if (['STRIPE', 'APPLE_PAY', 'APPLEPAY', 'STRIPE_APPLE_PAY', 'KLARNA', 'AFTERPAY', 'AFTERPAY_CLEARPAY'].includes(pgCode)) {
				const sp: any = await checkoutService.checkoutStripe({
					cartId,
					origin,
					pg: this.SELECTED_PG_CODE || 'apple_pay'
				})
				if (sp?.url) {
					window.location.href = sp.url
				} else {
					toast.error(sp?.message || 'Failed to initiate Stripe / Apple Pay payment')
					this.paymentLoader = false
				}
			} else if (pgCode === 'PAYPAL') {
				const res: any = await checkoutService.checkoutPaypal({
					cartId,
					origin,
					return_url: `${origin}/checkout/success`
				})
				if (res?.redirect_url) {
					window.location.href = `${res.redirect_url}`
				} else {
					toast.error('Something went wrong with PayPal')
					this.paymentLoader = false
				}
			} else if (pgCode === 'CASHFREE') {
				await this.loadCashfreeScript()
				const cf: any = await checkoutService.checkoutCashfree({
					cartId,
					email: this.cartState?.cart?.email || this.cartState?.cart?.shippingAddress?.email || '',
					origin
				})
				const cashfreeMethod = this.allPaymentMethods.find((f: PaymentMethod) => f?.code?.toUpperCase?.() === 'CASHFREE')
				const mode = cashfreeMethod?.isTest === false ? 'production' : 'sandbox'
				if (typeof (window as any).Cashfree === 'undefined') {
					toast.error('Cashfree SDK could not be loaded')
					this.paymentLoader = false
					return
				}
				const cashfree = (window as any).Cashfree({ mode })
				if (cf?.payment_session_id) {
					let checkoutOptions = {
						paymentSessionId: cf.payment_session_id,
						redirectTarget: '_modal'
					}
					cashfree.checkout(checkoutOptions).then((result: any) => {
						if (result.error) {
							toast.error(result.error.message || 'Payment closed or failed')
						}
						if (result.paymentDetails) {
							const orderNo = cf.order_no || cf.order_id || ''
							goto(`/checkout/process?pg=cashfree&order_no=${orderNo}&cart_id=${cartId}`)
						}
					})
				} else {
					toast.error('Payment session could not be created')
					this.paymentLoader = false
				}
			} else if (pgCode === 'COD') {
				const cp: any = await checkoutService.checkoutCOD({
					cartId,
					origin
				})
				const storeIdParam = page?.data?.storeId || page?.data?.store?.id || ''
				goto(`/checkout/process?pg=COD&order_no=${cp?.order_no}&cart_id=${cartId}&store_id=${storeIdParam}`)
			} else {
				toast.error(`Unsupported payment method: ${this.SELECTED_PG_CODE}`)
				this.paymentLoader = false
			}
		} catch (e: any) {
			console.error('Checkout error:', e)
			toast.error(e?.message || 'Checkout failed')
			try {
				fireGTagEvent('checkout_error', { error_message: e?.message || 'Checkout failed', checkout_step: 'payment' })
			} catch {}
			this.paymentLoader = false
		}
	}

  loadCashfreeScript = async (): Promise<void> => {
    if (typeof window !== 'undefined' && (window as any).Cashfree) {
      return
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js'
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Cashfree SDK'))
      document.head.appendChild(script)
    })
  }

	getShippingRates = async (cartId: string) => {
		try {
			const res = await checkoutService.getShippingRates({ cartId })
			this.shippingRates = res || {}

      // only one shipping rate and shipping rate not selected
      if (!this.cartState.cart?.shippingRateId && res?.data?.length === 1) {
        this.handleShippingRateChange(res?.data?.[0])
      }
		} catch (error) {
			console.error('getShippingRates', error)
		}
	}

	handleShippingRateChange = async (rate: { id: string }) => {
		if (!this.cartState?.cart?.id) return

		try {
			// shipping address is overridden by setShippingRate
			// incase user is logged out this causes a problem
			// hence this hack
			const previousShippingAddress = this.cartState?.cart?.shippingAddress
			await this.cartState?.setShippingRate({ shippingRateId: rate.id })
			if (this.cartState.cart) {
				this.cartState.cart.shippingAddress = previousShippingAddress
			}

			toast.success('Shipping rate changed')
		} catch (e: any) {
			toast.error(e.message || 'Shipping rate failed')
		} finally {
		}
	}

  handleAddressChange = async () => {
    goto(appendOneTimeCartId('/checkout/address?showEditAddress=true'))
  }

	handlePaymentMethodChange = async (code?: string) => {
    this.SELECTED_PG_CODE = code
    if (code) {
      this.cartState.cart.paymentMethod = code
    }
  }
}
