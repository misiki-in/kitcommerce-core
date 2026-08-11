import { getCartState } from '$lib/stores/index.js'
import { onMount } from 'svelte'
import { goto } from '$app/navigation'
import { toast } from 'svelte-sonner'
import { checkoutService, couponService, paymentMethodService } from '$lib/services/index.js'
import { browser } from '$app/environment'
import { page } from '$app/state'
import { appendOneTimeCartId, injectAffirm } from '$lib/utils/index.js'
import { fireGTagEvent } from '$lib/utils/gtag.js'

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
	  if (!shippingAddress) return this.allPaymentMethods

    if (shippingAddress && shippingAddress.country !== 'USA' && shippingAddress.countryCode !== 'US')
				return this.allPaymentMethods.filter((method: PaymentMethod) => method?.code?.toUpperCase?.() !== 'AFFIRMPAY' || method?.code?.toUpperCase?.() !== 'AFFIRM_PAY')

				
    return this.allPaymentMethods
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
						// Add a small delay to ensure the script is fully initialized
						setTimeout(() => {
							this.razorpayReady = true
						}, 1000)
					}
					document.head.appendChild(razorpayScript)
				}
				this.affirmPaymentMethod = this.allPaymentMethods.find((f: PaymentMethod) => f?.code?.toUpperCase?.() === 'AFFIRMPAY' || f?.code?.toUpperCase?.() === 'AFFIRM_PAY') || null
        if (this.affirmPaymentMethod) {
					if (shippingAddress?.country === 'USA' || shippingAddress?.countryCode === 'US') {
						injectAffirm(this.affirmPaymentMethod.apiKey, this.affirmPaymentMethod.isTest)
					}
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
			fireGTagEvent('checkout_error', { error_message: 'Please select a payment method', checkout_step: 'payment' })
			return
		}
		if (!this.cartState) return

		fireGTagEvent('add_payment_info', {
			total: this.cartState.cart.total,
			shipping: { charge: this.cartState.cart.shippingRate },
			items: this.cartState.cart.lineItems,
			retailer: {
				id: page.data.storeId,
				name: page.data.store?.name,
				email: page.data.store?.email
			}
		})

		this.paymentLoader = true
		if (this.getPaymentCode() === 'RAZORPAY') {
			// Razorpay checkout
			if (!this.razorpayReady) {
				toast.error('Please wait till payment gateway is ready')
			} else {
				try {
					const rp: any = await checkoutService.checkoutRazorpay({
						cartId: this.cartState.cart.id,
						origin: page.url.origin
					})
					this.order_no = rp?.order_no || ''
					if (rp && rp !== null) {
						const cartId = this.cartState.cart.id
						const options = {
							key: rp.key_id, // Enter the Key ID generated from the Dashboard
							description: `Order #${this.order_no}`,
							// rp.amount is already the order amount in the smallest unit (paise) — the
							// backend creates the order as totalAmount*100 and it is authoritative via
							// order_id below. Never apply a hardcoded FX/paise multiplier here.
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
								} finally {
								}
							},
							prefill: {
								name: this.cartState.cart?.name || this.cartState.cart?.shippingAddress?.name || page?.data?.store?.businessEmail || '',
								contact: this.cartState.cart?.phone || this.cartState.cart?.shippingAddress?.phone || page?.data?.store?.businessPhone || '',
								email: this.cartState.cart?.email || this.cartState.cart?.shippingAddress?.email || ''
							}
						}

						if (typeof window.Razorpay === 'undefined') {
							toast.error('Payment gateway is not ready yet')
							return
						}
						const rzp1 = new window.Razorpay(options)
						rzp1.open()
					} else {
						toast.error('Something went wrong')
					}
				} catch (e: any) {
					toast.error(e.message || "Checkout failed")
					fireGTagEvent('checkout_error', { error_message: 'Checkout failed (Razorpay)', checkout_step: 'payment' })
				} finally {
					this.paymentLoader = false
				}
			}
		} else if (this.getPaymentCode() === 'AFFIRMPAY' || this.getPaymentCode() === 'AFFIRM_PAY') {
      if (typeof affirm === 'undefined' || !affirm) {
				toast.error('Affirm is not ready yet')
			} else {
				try {
					affirm.ui.error.on('close', () => {
						this.paymentLoader = false
					})

					const affirmPayOrder: any = await checkoutService.createAffirmPayOrder({
						cartId: this.cartState.cart.id,
						addressId: this.cartState.cart.shippingAddressId ?? '',
						origin: page.url.origin,
						storeId: page.data.storeId,
						paymentMethodId: 'AffirmPay'
					})

					if (this.affirmPaymentMethod?.apiKey) {
						affirmPayOrder.merchant.public_api_key = this.affirmPaymentMethod.apiKey
					}
					affirmPayOrder.currency = 'USD'

					try {
						affirm.checkout(affirmPayOrder)
						const self = this
						affirm.checkout.open({
							onFail: async (error: any) => {
								self.paymentLoader = false
								toast.error('Affirm Payment Failed')
								await checkoutService.cancelAffirmOrder({
									orderId: affirmPayOrder?.order_id || '',
									storeId: page.data.storeId,
									origin: page.url.origin
								})
							},
							onSuccess: async (success_object: any) => {
								try {
									const res1 = await checkoutService.confirmAffirmOrder({
										affirmToken: success_object.checkout_token,
										orderId: affirmPayOrder?.order_id || '',
										storeId: page.data?.store?.id,
										origin: page.url.origin,
										// @ts-ignore - API might require this but TS doesn't know
										return_url: `${page.url.origin}/checkout/success`
									})
									goto(`/checkout/success?order_no=${affirmPayOrder?.order_id || ''}&status=PAYMENT_SUCCESS&provider=AffirmPay`)
								} catch (e: any) {
									toast.error(e.message || 'Failed to confirm Affirm order')
								} finally {
									self.paymentLoader = false
								}
							}
						})
					} catch (error) {
						console.error('Error initiating Affirm checkout:', error)
						this.paymentLoader = false
					}
				} catch (e: any) {
					toast.error(e.message || "Checkout failed")
					fireGTagEvent('checkout_error', { error_message: 'Checkout failed (Affirm)', checkout_step: 'payment' })
					this.paymentLoader = false
				} finally {
					this.cartState?.restorePrevCart()
				}
			}
		} else if (this.getPaymentCode() === 'PHONEPE') {
			// Phonepe checkout
			try {
				const pp: any = await checkoutService.checkoutPhonepe({
					cartId: this.cartState.cart.id,
					email: this.cartState.cart.email,
					phone: this.cartState.cart?.phone || this.cartState.cart?.shippingAddress?.phone || '',
					origin: page.url.origin
				})
				if (!pp) {
					toast.error('Something went wrong')
					return
				}
				const redirectUrl = pp?.redirectUrl
				if (redirectUrl && redirectUrl !== null) {
					window.location.href = redirectUrl
				} else {
				}
			} catch (e: any) {
        toast.error(e?.message || "Checkout failed")
				console.error('PHONEPE checkout', e)
				fireGTagEvent('checkout_error', { error_message: 'Checkout failed (Phonepe)', checkout_step: 'payment' })
			} finally {
				this.paymentLoader = false
			}
		} else if (this.getPaymentCode() === 'STRIPE') {
			try {
				// Stripe chekout
				const sp: any = await checkoutService.checkoutStripe({
					cartId: this.cartState.cart.id,
					origin: page.url.origin
				})
				if (sp.url) {
					window.location.href = sp.url
				} else {
					toast.error('Something went wrong, please check if order is placed by checking your email or contact support')
				}
			} catch (e: any) {
				toast.error(e.message || "Checkout failed")
				fireGTagEvent('checkout_error', { error_message: 'Checkout failed (Stripe)', checkout_step: 'payment' })
			} finally {
				this.paymentLoader = false
			}
		} else if (this.getPaymentCode() === 'PAYPAL') {
			try {
				const res: any = await checkoutService.checkoutPaypal({
					cartId: this.cartState.cart.id,
					origin: page.url.origin,
					return_url: `${page.url.origin}/checkout/success`
				})
				if (res?.redirect_url && res?.redirect_url !== null) {
					window.location.href = `${res.redirect_url}`
				} else {
					toast.error('Something went wrong, please check if order is placed by checking your email or contact support')
				}
			} catch (e: any) {
				toast.error(e.message || 'Checkout Failed')
				fireGTagEvent('checkout_error', { error_message: 'Checkout failed (Paypal)', checkout_step: 'payment' })
			} finally {
				this.paymentLoader = false
			}
		} else if (this.getPaymentCode() === 'CASHFREE') {
			try {
				await this.loadCashfreeScript()
				const cf: any = await checkoutService.checkoutCashfree({
					cartId: this.cartState.cart.id,
					email: this.cartState.cart.email || this.cartState.cart.shippingAddress?.email || '',
					origin: page.url.origin
				})

				const cashfreeMethod = this.allPaymentMethods.find((f: PaymentMethod) => f?.code?.toUpperCase?.() === 'CASHFREE')
				const mode = cashfreeMethod?.isTest === false ? 'production' : 'sandbox'

				if (typeof (window as any).Cashfree === 'undefined') {
					toast.error('Cashfree SDK could not be loaded')
					return
				}

				const cashfree = (window as any).Cashfree({ mode })

				if (cf?.payment_session_id) {
					let checkoutOptions = {
						paymentSessionId: cf.payment_session_id,
						redirectTarget: "_modal",
					}
					cashfree.checkout(checkoutOptions).then((result: any) => {
						if (result.error) {
							console.error("User has closed the popup or there is some payment error, Check for Payment Status");
							console.error('cashfree checkout', result.error);
							toast.error(result.error.message || 'Payment closed or failed');
						}
						if (result.redirect) {
							
						}
						if (result.paymentDetails) {
							const cartId = this.cartState.cart.id
							const orderNo = cf.order_no || cf.order_id || ''
							goto(`/checkout/process?pg=cashfree&order_no=${orderNo}&cart_id=${cartId}`)
						}
					})
				} else {
					toast.error('Something went wrong, payment session could not be created')
				}
			} catch (e: any) {
				toast.error(e.message || 'Checkout Failed')
				fireGTagEvent('checkout_error', { error_message: 'Checkout failed (Cashfree)', checkout_step: 'payment' })
			} finally {
				this.paymentLoader = false
			}
		} else if (this.getPaymentCode() === 'COD') {
			try {
				// COD chekout
				const cp: any = await checkoutService.checkoutCOD({
					cartId: this.cartState.cart.id,
					origin: page.url.origin
				})
				goto(`/checkout/process?pg=COD&order_no=${cp?.order_no}&cart_id=${this.cartState.cart.id}&store_id=${page.data.storeId}`)
			} catch (e: any) {
				toast.error(e.message || "Checkout failed")
				fireGTagEvent('checkout_error', { error_message: 'Checkout failed (COD)', checkout_step: 'payment' })
			} finally {
				this.paymentLoader = false
			}
		}
	}

  private async loadCashfreeScript(): Promise<void> {
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
