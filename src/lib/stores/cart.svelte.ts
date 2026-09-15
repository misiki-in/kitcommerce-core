import { getContext, onMount, setContext } from 'svelte'
import { toast } from 'svelte-sonner'
import { cartService } from '$lib/services/index.js'
import type { Cart } from '$lib/types/index.js'

const initialCart: Cart = {
	id: '',
	lineItems: [],
	subtotal: 0,
	total: 0,
	email: null,
	phone: null,
	billingAddressId: null,
	shippingAddressId: null,
	regionId: null,
	userId: null,
	salesChannelId: null,
	storeId: null,
	couponCode: null,
	discountAmount: 0,
	savingAmount: 0,
	shippingCost: null,
	returnAllowed: false,
	replaceAllowed: false,
	originCountry: null,
	weightUnit: 'g',
	dimensionUnit: 'cm',
	metadata: null,
	collectionId: null
}

interface AddToCartParams {
	qty: number
	productId: string
	variantId: string
	lineId?: string
}

interface UpdateCartParams {
	qty: number
	lineId: string
	productId: string
	variantId: string
	isSelectedForCheckout?: boolean
}

interface UpdateEmailParams {
	email: string
	phone?: string
}

interface UpdateShippingAddressParams {
	shippingAddress: any
	billingAddress?: any
	isBillingAddressSameAsShipping?: boolean
}

interface AddOrUpdateParams {
	productId: string
	variantId: string
	qty: number
}

interface RemoveParams {
	cartId: string
	lineId: string
}

interface SetShippingRateParams {
	shippingRateId: string
}

interface CreateSingleItemCheckoutParams {
	productId: string
	variantId: string
	qty: number
}
export class Cart2State {
	cart = $state<Cart>(initialCart)
	isUpdatingCart = $state<boolean>(true)
	updatingItem = $state<Record<string, boolean>>({})
	isOpen = $state<boolean>(false)
	addToCartMessage = $state<string>('Add to cart')
	showCheckout = $state<boolean>(false)
	hasLoaded: Promise<void>

	async setSelectedPaymentMethod(code: string) {
		try {
			const cartId = this.cart?.id
			if (!cartId) return
			const c = await cartService.updateCartPaymentMethod({ cartId, paymentMethod: code })
			this.cart = c
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : 'Failed to save payment method')
		}
	}
	retrieveCartId = () => {
		const cartId = localStorage.getItem('cart_id') || null
		return cartId
	}

	constructor() {
		this.hasLoaded = new Promise((res, rej) => {
			onMount(async () => {
				try {
					this.isUpdatingCart = true
					let searchParams: URLSearchParams | null = null
					if (typeof window !== 'undefined' && window.location?.search) {
						searchParams = new URLSearchParams(window.location.search)
					}
					const productsParam = searchParams?.get('products')
					const couponParam = searchParams?.get('coupon') || searchParams?.get('couponCode')
					const productsJsonParam = searchParams?.get('products_json')

					if (productsParam) {
						const currentCartId = this.retrieveCartId()
						const isExistingCheckoutSession = sessionStorage.getItem('is_checkout_url_session') === 'true'
						if (currentCartId && !isExistingCheckoutSession) {
							localStorage.setItem('prev_cart_id', currentCartId)
						}
						sessionStorage.setItem('is_checkout_url_session', 'true')
						try {
							const newCart = await this.createCartFromCheckoutUrl({
								products: productsParam,
								coupon: couponParam || undefined,
								products_json: productsJsonParam || undefined,
							})
							if (newCart && newCart.id) {
								localStorage.setItem('cart_id', newCart.id)
								sessionStorage.setItem('checkout_url_cart_id', newCart.id)
								this.cart = newCart
							}
						} catch (err) {
							console.error('Failed to create cart from checkout URL:', err)
						}
					} else {
						const prevCartId = localStorage.getItem('prev_cart_id')
						const isCheckoutSession = sessionStorage.getItem('is_checkout_url_session') === 'true'
						if (prevCartId && !isCheckoutSession) {
							localStorage.setItem('cart_id', prevCartId)
							localStorage.removeItem('prev_cart_id')
						}
						this.resetSingleItemCheckoutSession()
						const cartId = this.retrieveCartId()
						if (cartId) {
							try {
								const c = await cartService.getCartByCartId(cartId)
								if (!c.hasOwnProperty('message')) this.cart = c
							} catch (e) {
								try {
									const c = await cartService.getCartByCartId(cartId)
									if (!c.hasOwnProperty('message')) this.cart = c
								} catch (e2) {
									console.error('Cart hydration failed; bag may display empty:', e2)
								}
							}
						}
					}
					res()
				} catch (e) {
					rej()
				} finally {
					this.isUpdatingCart = false
				}
			})
		})
	}

	async refershCart() {
		try {
			this.isUpdatingCart = true
			const cartId = this.retrieveCartId()
			if (cartId) {
				try {
					const c = await cartService.refereshCart()
					this.cart = c
				} catch (e) {}
			}
		} catch (e) {
		} finally {
		}
		this.isUpdatingCart = false
	}

	async add({ qty, productId, variantId, lineId }: AddToCartParams) {
		// } else {
		if (!this.cart?.lineItems) this.cart = { ...this.cart, lineItems: [] }
		let cart_item = this.cart.lineItems.find((item) => item?.id === lineId)
		if (!cart_item) {
			cart_item = this.cart.lineItems.find(
				(item) => item?.productId === productId && item?.variantId === variantId
			)
			lineId = cart_item?.id
		}
		const cart_qty = cart_item?.qty || 0
		if (lineId && cart_qty < 2 && qty < 1) {
			qty = -9999999
		}
		this.addToCartMessage = 'Adding to cart...'
		if (lineId) this.updatingItem[lineId] = true
		try {
			const c = await cartService.addToCart({
				// The in-memory id is '' until the onMount hydration lands; falling back to the
				// persisted id stops an early add from spawning a fresh cart that orphans the
				// shopper's existing one.
				cartId: this.cart.id || this.retrieveCartId(),
				lineId: lineId || null,
				qty,
				productId: productId,
				variantId: variantId
			})
			this.cart = c
			this.addToCartMessage = 'Proceed to checkout'
			this.showCheckout = true
			setTimeout(() => {
				this.addToCartMessage = 'Add to cart'
				this.showCheckout = false
			}, 5000)
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : 'Add to cart failed')
			this.addToCartMessage = 'Add to cart'
		} finally {
			if (lineId) this.updatingItem[lineId] = false
		}
	}

	async update({ qty, lineId, productId, variantId, isSelectedForCheckout = true }: UpdateCartParams) {
		try {
			this.addToCartMessage = 'Adding to cart...'
			this.updatingItem[lineId] = true
			const c = await cartService.updateCart({
				cartId: this.cart.id,
				lineId,
				qty,
				productId,
				variantId,
				isSelectedForCheckout
			})
			this.cart = c
			this.addToCartMessage = 'Proceed to checkout'
			this.showCheckout = true
			setTimeout(() => {
				this.addToCartMessage = 'Add to cart'
				this.showCheckout = false
			}, 5000)
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : 'Update cart failed')
			this.addToCartMessage = 'Add to cart'
		} finally {
			this.updatingItem[lineId] = false
		}
	}

	// async completeCart({ cart_id }: any) {
	//   try {
	//   } catch (e) {
	//     toast.error(e.message)
	//     throw e.message
	//   } finally {

	async updateEmail({ email, phone }: UpdateEmailParams) {
		try {
			this.isUpdatingCart = true
			const c = await cartService.updateCart2({ email, phone })
			this.cart = c
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : 'Update email failed')
			throw e instanceof Error ? e : new Error(String(e))
		} finally {
			this.isUpdatingCart = false
		}
	}

	applyCoupon = async (couponCode: string) => {
		try {
			this.isUpdatingCart = true
			const cartId = this.retrieveCartId()
			const c = await cartService.applyCoupon({ cartId, couponCode })
			this.cart = c
			return c
		} catch (e: unknown) {
			toast.error(e?.message || 'Apply coupon failed')
			throw e instanceof Error ? e : new Error(String(e))
		} finally {
			this.isUpdatingCart = false
		}
	}

	removeCoupon = async () => {
		try {
			this.isUpdatingCart = true
			const c = await cartService.removeCoupon()
			this.cart = c
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : 'Remove coupon failed')
			throw e instanceof Error ? e : new Error(String(e))
		} finally {
			this.isUpdatingCart = false
		}
	}

	async updateShippingAddress({ shippingAddress, billingAddress, isBillingAddressSameAsShipping = true }: UpdateShippingAddressParams) {
		try {
			this.isUpdatingCart = true
			const c = await cartService.updateCart2({
				shippingAddress,
				billingAddress,
				isBillingAddressSameAsShipping
			})
			//  // {  ...c }

			const cart = await cartService.getCartByCartId(c.id)
			this.cart = { ...cart }
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : 'Update shipping address failed')
			throw e instanceof Error ? e : new Error(String(e))
		} finally {
			this.isUpdatingCart = false
		}
	}

	async addOrUpdate({ productId, variantId, qty }: AddOrUpdateParams) {
		const line_item = this.cart?.lineItems?.find?.((item) => item?.productId === productId && item?.variantId === variantId)
		if (line_item) {
			await this.update({
				qty: qty + line_item.qty,
				lineId: line_item.id,
				productId: productId,
				variantId: variantId
			})
		} else {
			await this.add({ qty, productId, variantId })
		}
		// try {
		// } catch (e) {
		//   // toast.error(e.message)
		//   throw e.message
		// } finally {
	}

	async remove({ cartId, lineId }: RemoveParams) {
		try {
			this.isUpdatingCart = true
			const c = await cartService.removeCart({ cartId, lineId })
			this.cart = c
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : 'Remove item failed')
			throw e instanceof Error ? e : new Error(String(e))
		} finally {
			this.isUpdatingCart = false
			this.showCheckout = false
		}
	}

	async clear() {
		try {
			this.isUpdatingCart = true
			this.cart = null
			localStorage.removeItem('cart_id')
			this.cart = initialCart
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : 'Clear cart failed')
			throw e instanceof Error ? e : new Error(String(e))
		} finally {
			this.isUpdatingCart = false
		}
	}

	async setShippingRate({ shippingRateId }: SetShippingRateParams) {
		try {
			this.isUpdatingCart = true
			const c = await cartService.updateShippingRate({ shippingRateId, cartId: this.cart.id })
			this.cart = c
		} catch (e: unknown) {
			throw e instanceof Error ? e : new Error(String(e))
		} finally {
			this.isUpdatingCart = false
		}
	}

	async createSingleItemCheckoutSession({ productId, variantId, qty }: CreateSingleItemCheckoutParams) {
		try {
			this.isUpdatingCart = true

			// save cart id to local storage as prev_cart_id
			const cartId = this.retrieveCartId()
			if (cartId) {
				localStorage.setItem('prev_cart_id', cartId)
				localStorage.removeItem('cart_id')
			}

			// create new cart
			const cart = await cartService.addToCart({
				qty: qty,
				productId,
				variantId,
				lineId: null
			})

			this.cart = cart
		} catch (error: unknown) {
			console.error('CartState ~ createSingleItemCheckoutSession:', error)
			toast.error(error instanceof Error ? error.message : 'Create checkout session failed')
		} finally {
			this.isUpdatingCart = false
		}
	}

	async resetSingleItemCheckoutSession() {
		try {
			this.isUpdatingCart = true
			const prev_cart_id = localStorage.getItem('prev_cart_id')
			if (prev_cart_id) {
				localStorage.setItem('cart_id', prev_cart_id)
				localStorage.removeItem('prev_cart_id')
			}
			this.cart = initialCart
		} catch (error: unknown) {
			console.error('CartState ~ resetSingleCartSession:', error)
			toast.error(error instanceof Error ? error.message : 'Error resetting cart')
		} finally {
			this.isUpdatingCart = false
		}
	}

	async restorePrevCart() {
		try {
			this.isUpdatingCart = true
			const prev_cart_id = localStorage.getItem('prev_cart_id')
			if (prev_cart_id) {
				const cart = await cartService.getCartByCartId(prev_cart_id)
				this.cart = cart
				localStorage.setItem('cart_id', prev_cart_id)
				localStorage.removeItem('prev_cart_id')
			}
		} catch (error: unknown) {
			//console.error('CartState ~ restorePrevCart:', error)
			toast.error(error instanceof Error ? error.message : 'Error restoring cart')
		} finally {
			this.isUpdatingCart = false
		}
	}


	async createCartFromCheckoutUrl(params: { products: string; coupon?: string; products_json?: string }) {
		try {
			this.isUpdatingCart = true
			const response = await fetch('/api/carts/from-checkout-url', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(params),
			})
			if (!response.ok) {
				const errData = await response.json().catch(() => ({}))
				throw new Error(errData?.message || 'Failed to create cart from checkout URL')
			}
			const cart = await response.json()
			return cart
		} catch (error: unknown) {
			console.error('CartState ~ createCartFromCheckoutUrl:', error)
			toast.error(error instanceof Error ? error.message : 'Error initializing checkout cart')
			throw error
		} finally {
			this.isUpdatingCart = false
		}
	}

	async endCheckoutUrlSession() {
		try {
			sessionStorage.removeItem('is_checkout_url_session')
			sessionStorage.removeItem('checkout_url_cart_id')
			const prev_cart_id = localStorage.getItem('prev_cart_id')
			if (prev_cart_id) {
				localStorage.setItem('cart_id', prev_cart_id)
				localStorage.removeItem('prev_cart_id')
			} else {
				localStorage.removeItem('cart_id')
			}
		} catch (error: unknown) {
			console.error('CartState ~ endCheckoutUrlSession:', error)
		}
	}

	// remove(item_id: string, qty: number) {
	//     clearTimeout(timeout)
}

const CART_KEY = Symbol('CART')

export function setCartState() {
  try {
	  return setContext(CART_KEY, new Cart2State())
  } catch(e: any) {
  }
}

export function getCartState() {
	return getContext<ReturnType<typeof setCartState>>(CART_KEY)
}
