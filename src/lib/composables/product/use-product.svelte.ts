import { browser } from '$app/environment'
import { afterNavigate, goto } from '$app/navigation'
import { page } from '$app/state'
import type { CarouselAPI } from '$lib/types/index.js'
import { storeProductToRecentlyViewed, findVariantWithOptionValue, addPendingWishlistAction, checkPendingWishlistActions } from '$lib/logic/index.js'
import { getUserState, getCartState, getWishlistState, getProductKey } from '$lib/stores/index.js'
import { deepCopy, fireGTagEvent } from '$lib/utils/index.js'
import { meilisearchService, productService, reviewService, wishlistService } from '$lib/services/index.js'
import { onMount } from 'svelte'
import { toast } from 'svelte-sonner'

const PRODUCT_STATE_KEY = Symbol('product-state')

class ProductState {
  static _instance: ProductState
	ADD_TO_CART_MESSAGE_DURATION = 10000

	userState = getUserState()
	cartState = getCartState()
  wishlistState = getWishlistState()

	isAdding = $state(false)
	showReviewForm = $state(false)
	ratingLabels = {
		0: { text: 'Very Disappointed', color: 'text-red-600' },
		1: { text: 'Slightly Disappointed', color: 'text-orange-600' },
		2: { text: 'Good', color: 'text-green-600' },
		3: { text: 'Very Good', color: 'text-green-600' },
		4: { text: 'Excellent', color: 'text-green-600' }
	}
	qty = $state(1)
	isLoading = $state(true)
	allRatings = $state(null)
	productsOfSameCategory = $state([])
	isLoadingRatings = $state(false)
	isLoadingRelatedProducts = $state(false)
	relatedProducts = $state({})
	displayCarousel = $state('hidden')
	selectedImage = $state(page.data?.product?.thumbnail || '')
	selectedVariant: any = $state({})
	viewPortCartPositionFromTop = $state(0)
	select: number | null = $state(null)
	reviewMessage = $state('')
	uploading = $state(false)
	uploadedImagestoSave = $state([''])
	showDescription = $state(false)
	returnPlugin = $derived(page.data?.store?.plugins?.returnAndExchange)
	showReturnPolicy = $state(page.data?.store?.plugins?.returnAndExchange?.below_more === true ? false : true)
	showAddToCartMessage = $state(false)
	single = true
	showLoginModal = $state(false)
	showSimilarDrawer = $state<boolean>(false)
	selectedAggregations = $state<Record<string, string>>({})

	carousel: HTMLDivElement | null = null
	carouselApi: CarouselAPI | null = $state(null)
	currentIndex = $state(0)

	structuredData: any = $state({})
	showEnquiryModal = $state(false)

	anyVariantStockThere = $derived(page.data?.product?.variants?.some((v) => (v.stock || 0) > 0))

	trustBadgesPlugin = $derived(page.data?.store?.plugins?.trustBadges)

	productImagesArray = $derived.by(() => {
		if (this.selectedVariant?.images) return this.selectedVariant.images.split(',').map((i: string) => i.trim())
    else if (page.data.product.images)
		  return page.data.product.images.split(',').map((i: string) => i.trim())
    return []
  })

	carouselImages = $state(this.productImagesArray)

	productOptions: any[] = $state(page.data?.product?.options || [])

	images = $state([])
	uploadedImages = $state([])

	wishlistPluginEnabled = $derived(page?.data?.store?.plugins?.isWishlist?.active)
	isIndianPincodesPluginEnabled = $derived(page?.data?.store?.plugins?.isIndianPincodes?.active)
	wareHousePluginEnabled = $derived(page?.data?.store?.plugins?.warehouse?.active)

	wishlisted = $derived(this.wishlistState.isWishlisted[getProductKey(page.data.product)])
	wishlistLoading = $state(false)

	warehouses = $state<Record<string, unknown>[]>([])
  warehouseLoaded = $state(false)

	addToCartButtonDisabled = $derived(
		this.isAdding ||
		(!page.data?.product?.manageInventory ? false : this.anyVariantStockThere ? (this.selectedVariant?.manageInventory && !this.selectedVariant?.stock) : !page.data?.product.stock)
  )

  title = $derived.by(() => {
    if (this.selectedVariant?.title && this.selectedVariant?.title !== 'default')
      return this.selectedVariant.title
    else
      return page.data?.product?.title
  })

	refreshOptions = () => {
		if (page.data?.product?.options?.length) {
			this.productOptions = page.data.product.options.map((option) => {
				option.values = option.values?.map?.((_value: any) => {
					_value.selectable = true
					return _value
				})
				return option
			})
		}
	}

	onSelect(i) {
		this.select = i
	}

	incrementQuantity = () => {
		this.qty++
	}

	decrementQuantity = () => {
		if (this.qty > 1) {
			this.qty--
		}
	}

	// TODO: can we improve this
	isAggregationAvaliable = (optionName: string, value: string) => {
		return !!page.data?.product?.pg?.find((product: Record<string, string>) => {
			return Object.entries({ ...this.selectedAggregations, [optionName]: value }).every(([key, val]) => {
				return product[key] === val
			})
		})
	}

	toggleAggregation = async (optionName: string, value: string) => {
		if (!this.isAggregationAvaliable(optionName, value)) this.selectedAggregations = { [optionName]: value }
		else if (this.selectedAggregations[optionName] === value) delete this.selectedAggregations[optionName]
		else this.selectedAggregations = { ...this.selectedAggregations, [optionName]: value }

		const matchingProduct = page.data?.product?.pg?.find((product) => {
			return Object.entries(this.selectedAggregations).every(([key, val]) => {
				return product[key] === val
			})
		})

		productService
			.listRelatedProducts({ page: 1, categoryId: page.data?.product?.categoryId })
			.then((data) => {
				this.relatedProducts = deepCopy(page.data)
			})
			.catch((err) => {
				console.error('list related products', err)
			})
	}

	constructor() {
		$effect(() => {
			// Mark all options as selectable at initial render
			if (page.data?.product?.options?.length) {
				this.refreshOptions()
			} else {
				this.productOptions = []
			}
		})

		$effect(() => {
			if (page.data?.product?.pg && page.data?.product?.slug) {
				const currentProduct = page.data.product.pg.find((p) => p.slug === page.data.product.slug)

				if (currentProduct) {
					const newSelectedAggregations = {}
					Object.entries(page.data.product.ag || {}).forEach(([key]) => {
						if (currentProduct[key]) {
							newSelectedAggregations[key] = currentProduct[key]
						}
					})
					this.selectedAggregations = newSelectedAggregations
				}
			}
		})
	}
}

export function createProductStateContext() {
	const productState = new ProductState()
  ProductState._instance = productState
	return productState
}

export function useProductState() {
  return ProductState._instance
}
