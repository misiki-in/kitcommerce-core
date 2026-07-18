import { browser } from '$app/environment'
import { afterNavigate, goto } from '$app/navigation'
import { page } from '$app/state'
import type { CarouselAPI } from '$lib/types/index.js'
import { storeProductToRecentlyViewed, findVariantWithOptionValue, addPendingWishlistAction, checkPendingWishlistActions } from '$lib/logic/index.js'
import { getUserState, getCartState, getWishlistState, getProductKey } from '$lib/stores/index.js'
import { deepCopy, fireGTagEvent } from '$lib/utils/index.js'
import { meilisearchService, productService, reviewService, wishlistService } from '$lib/services/index.js'
import { getContext, onMount, setContext } from 'svelte'
import { toast } from 'svelte-sonner'

const PRODUCT_STATE_KEY = Symbol('product-state')

class ProductState {
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

	toggleAggregation = async (optionName: string, value: string, noScroll = true) => {
		if (!this.isAggregationAvaliable(optionName, value)) this.selectedAggregations = { [optionName]: value }
		else if (this.selectedAggregations[optionName] === value) delete this.selectedAggregations[optionName]
		else this.selectedAggregations = { ...this.selectedAggregations, [optionName]: value }

		const matchingProduct = page.data?.product?.pg?.find((product) => {
			return Object.entries(this.selectedAggregations).every(([key, val]) => {
				return product[key] === val
			})
		})

		/* This case is when user selects a disabled option */
		if (Object.keys(this.selectedAggregations).length === 1) {
			const allKeys = Object.keys(page.data.product?.ag || {})
			const selectedKey = Object.keys(this.selectedAggregations)[0]
			const otherKeys = allKeys.filter((key) => key !== selectedKey)

			for (const key of otherKeys) {
				const value = matchingProduct?.[key]
				value && (this.selectedAggregations[key] = value)
			}
		}

		if (matchingProduct?.id) {
			page.data.product.id = matchingProduct.id
		}

		if (matchingProduct?.slug) {
			await goto(`/products/${matchingProduct.slug}?variant_id=${matchingProduct.variantId}`, { noScroll, replaceState: true })

			setTimeout(() => {
        // productImagesArray is not a derived property
				if (page.data?.product?.images) {
					//this.productImagesArray = []
					// carouselImages = [];

					// const newImagesArray = page.data.product.images.split(",").map(i => i.trim());
					//const newImagesArray = page.data.product.images.split(',').map((i) => i.trim())
					//this.productImagesArray = newImagesArray
					// carouselImages = newImagesArray;
					//this.selectedImage = page.data.product.thumbnail || ''

					this.currentIndex = 0
					if (this.carouselApi) {
						this.carouselApi.scrollTo(0)
					}
				}
			}, 100)
		}
	}

	mount = async () => {
		this.isLoading = true

		this.findAndSelectVariantFromSearchParam()

		browser && (await storeProductToRecentlyViewed({ product: page.data?.product, variant: this.selectedVariant }))

		this.isLoading = false
		this.relatedProducts = await productService.listRelatedProducts({ page: 1, categoryId: page.data?.product?.categoryId })
		fireGTagEvent('view_item', { ...page.data.product, qty: 1 })
	}

	findAndSelectVariantFromSearchParam = () => {
		if (page.data?.product?.variants?.length) {
			const variantId = page.url.searchParams.get('variant_id')
			if (variantId && variantId !== '') {
				this.selectedVariant = page.data?.product?.variants.find((v) => v.id === variantId) || page.data?.product?.variants[0]
			} else {
				this.selectedVariant = page.data?.product?.variants?.find((v) => v.title == 'default') || page.data?.product?.variants[0]
				goto(`?variant_id=${this.selectedVariant?.id || ''}`, { replaceState: true, noScroll: true })
			}
		}
    if (!this.selectedVariant) console.error("Failed to select a variant")
	}

	selectVariant = async ({ option, value }: { option: any; value: any }) => {
		if (page.data?.product?.variants) {
			this.selectedVariant = findVariantWithOptionValue(page.data?.product.variants, {
				optionId: option.id,
				value: value.value,
				selectedVariant: this.selectedVariant
			})

			// Mark options that are not selectable
			if (page.data?.product?.options) {
				this.productOptions = page.data.product.options.map((option) => {
					option.values = option.values.map((_value: any) => {
						_value.selectable = this.isOptionSelectable(option.id, _value.value, option.id, value.value)
						return _value
					})
					return option
				})
			}

			// noScroll: selecting an option must not jump the page to the top (match the jws reference).
			if (this.selectedVariant?.id) goto(`?variant_id=${this.selectedVariant?.id || ''}`, { replaceState: true, noScroll: true })
		}
	}

	isOptionSelectable = (optionId: string, value: string, clickedOptionId: string, clickedValue: string) => {
		if (!this.selectedVariant?.options) return true
		if (optionId === clickedOptionId) return true

		// Check if the option is selectable by checking if the option is already selected
		const f = page.data?.product?.variants?.find?.((v) => {
			const isVariantHavingClickedOption = v?.options?.some?.((option) => option.optionId === clickedOptionId && option.value === clickedValue)
			const isVariantHavingOption = v?.options?.some?.((option) => option.optionId === optionId && option.value === value)
			return isVariantHavingClickedOption && isVariantHavingOption
		})

		return !!f
	}

	isVariantOptionSelected = (optionId: string, value: string) => {
		return this.selectedVariant?.options?.some((option: Record<string, any>) => option.value === value && option.optionId === optionId)
	}

	handleImageChange = async (event: Event) => {
		if (this.uploading) return
		this.uploading = true

		const target = event.target as HTMLInputElement
		if (target.files?.length) {
			let newImages = Array.from(target.files)
			if (this.single) {
				newImages = [newImages[0]]
				this.images = newImages
				this.uploadedImages = []
				// console.log(newImages, images)
			} else {
				this.images = [...this.images, ...newImages]
			}
			// console.log(newImages)
			for (const image of newImages) {
				await image
			}
		}

		this.uploading = false // Reset uploading flag after processing all images
	}

	removeSelectedImage = (path: string) => {
		this.uploadedImagestoSave = this.uploadedImagestoSave.filter((t) => t !== path)
	}

	checkIfWishlisted = async (id: string) => {
		if (!id) return

		if (!this.userState?.user?.userId) {
			return
		}

		try {
			const res = await wishlistService.checkWishlist({
				productId: page.data?.product?.id,
				variantId: this.selectedVariant?.id
			})

			return res
		} catch (error: any) {
			console.error('checkIfWishlisted', error)
		}
	}

	handleWishlistClick = async () => {
		if (!this.userState?.user?.userId) {
			addPendingWishlistAction({
				productId: page.data?.product?.id,
				variantId: this.selectedVariant?.id || ''
			})

			this.showLoginModal = true
			toast.error('Please login to add to wishlist', { position: 'top-right' })
			return
		}

		if (this.userState?.user?.role !== 'USER') {
			toast.error('Only users can add to wishlist', { position: 'top-right' })
			return
		}

		this.wishlistLoading = true
    await this.wishlistState.toggleWishlist(page.data.product)
		this.wishlistLoading = false
	}

	buyNow = async () => {
		try {
			const variantId = this.selectedVariant?.id || page.data?.product?.id
			const productId = page.data?.product?.id
			const qty = this.qty

			this.cartState.createSingleItemCheckoutSession({
				variantId,
				productId,
				qty
			})

			goto('/checkout/address')
		} catch (error) {
			console.error('Error during buy now:', error)
			toast.error('Failed to proceed to checkout')
		}
	}

	setInitialSelectedVariant = () => {
		if (page.data?.product?.variants?.length) {
			const variantId = page.url.searchParams.get('variant_id')
			const variants = page.data?.product?.variants
			if (variantId) {
				this.selectedVariant = variants.find((v) => v.id === variantId)
			} else {
				this.selectedVariant = variants?.find((v) => v.title !== 'default')
			}
			// Fallback: never leave selectedVariant undefined (e.g. a deep-linked variant_id that
			// matches no variant), otherwise selectVariant -> findVariantWithOptionValue throws.
			if (!this.selectedVariant) {
				this.selectedVariant = variants?.find((v) => v.title === 'default') || variants?.[0]
			}
		}
	}

	handleAddToCart = async () => {
		try {
			this.isAdding = true
			await this.cartState.addOrUpdate({
				productId: page.data?.product?.id,
				variantId: this.selectedVariant?.id,
				qty: this.qty
			})
		} catch (e) {
			toast.error((e as Error).message || 'Failed to add item')
      return false
		} finally {
			this.isAdding = false
		}
		if (this.qty > 0) {
			// cartState.isOpen = true
			this.showAddToCartMessage = true
			setTimeout(() => {
				this.showAddToCartMessage = false
			}, this.ADD_TO_CART_MESSAGE_DURATION)

			const me = this.userState?.user
			const dataToFire = {
				items: [{ ...page.data?.product, qty: this.qty }],
				total: page.data?.product?.price * this.qty,
				qty: this.qty,
				vendorBusinessName: page.data?.product?.vendor?.businessName,
				user: {
					id: me?._id || me?.id,
					name: me?.firstName + ' ' + me?.lastName,
					email: me?.email
				}
			}
			fireGTagEvent('add_to_cart', dataToFire)
		}
    return true
	}

	constructor() {
    // onMount to ensure support for HMR
    let onMountLock = false
    onMount(async () => {
      onMountLock = true
      await this.mount()
    })
		afterNavigate(async () => {
      if (onMountLock) {
        onMountLock = false
        return;
      }
			await this.mount()
		})

		//$effect(() => {
		//	if (this.userState?.user?.userId) {
		//		checkPendingWishlistActions(this.userState?.user?.userId)
		//			.then((value) => {
		//				//this.wishlisted = value || false
		//				//value && toast.success('Item added to wishlist')
		//			})
		//			.catch()
		//	}
		//})

		//$effect(() => {
		//	if (this.selectedVariant?.id || page.data?.product?.id) {
		//		this.checkIfWishlisted(this.selectedVariant?.id || page.data?.product?.id)
		//			.then((val) => {
		//				//this.wishlisted = val || false
		//			})
		//			.catch((err) => {
		//				console.error('$effect to check ifWishlisted', err)
		//			})
		//	}
		//})

		onMount(async () => {
			// Load ratings and related products after the main content is displayed (lazy loading)

			// Load product ratings
			this.isLoadingRatings = true
			try {
				//const ratingsResponse = await reviewService.allReviews({})
				this.allRatings = page.data.product?.ratings//ratingsResponse.data
			} catch (error) {
				console.error('Error loading ratings:', error)
			} finally {
				this.isLoadingRatings = false
			}

			// Load related products from same category
			const categorySlug = page.data?.product?.categoryHierarchy?.[page.data?.product?.categoryHierarchy?.length - 1]?.slug
			if (categorySlug) {
				this.isLoadingRelatedProducts = true
				try {
					const result = await meilisearchService.search({ categories: categorySlug, query: '' })
					this.productsOfSameCategory = result?.hits?.filter((x) => x.id !== page.data?.product?.id) || []
				} catch (error) {
					console.error('Error loading related products:', error)
				} finally {
					this.isLoadingRelatedProducts = false
				}
			}
		})

		onMount(async () => {
			try {
        if (!this.wareHousePluginEnabled)
          return
        this.warehouseLoaded = false

				const res = await fetch(`/api/products/${page.data?.product?.id}/warehouse`, {
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						'x-litekart-store': page.data?.store?.id || ''
					}
				})

				const jsonRes = await res.json()
				if (jsonRes?.data?.length) {
					this.warehouses = jsonRes.data
				}

        this.warehouseLoaded = true
			} catch (error) {
				console.error(error)
			} 
		})

		$effect(() => {
			if (page.data?.product) {
				this.structuredData = {
					name: page.data?.product?.title,
					// all gallery images, not just the thumbnail
					image: page.data?.product?.images
						? page.data.product.images
								.split(',')
								.map((i: string) => i.trim())
								.filter(Boolean)
						: [page.data?.product?.thumbnail].filter(Boolean),
					description: page.data?.product?.description,
					sku: page.data?.product?.sku,
					// brandName intentionally omitted — the schema component falls back to the store
					// brand. (The previous value was vendorId, a UUID, which is invalid for brand.name.)
					aggregateRating: {
						ratingValue: page.data?.product?.rating,
						reviewCount: page.data?.product?.reviewCount
					},
					url: page.url.href,
					priceCurrency: page?.data?.store?.currency?.code,
					price: page.data?.product?.price,
					availability: page.data?.product?.stock > 0 ? 'InStock' : 'OutOfStock'
				}
			}
		})

		$effect(() => {
      // productImagesArray is not derived property
      /*
			if (page.data?.product?.images) {

				this.productImagesArray = page.data?.product?.images?.split(',').map((i) => {
					return i.trim()
				})
				this.selectedImage = page.data?.product?.thumbnail || ''
			}
      */
			productService
				.listRelatedProducts({ page: 1, categoryId: page.data?.product?.categoryId })
				.then((data) => {
					// assign the fetched related products, not a deep clone of the whole page payload
					this.relatedProducts = data
				})
				.catch((err) => {
					console.error('list related products', err)
				})

			// if (carousel) {
			// 	carousel.addEventListener('scroll', () => {
			// 		// Update currentIndex when carousel scrolls
			// 		currentIndex = Math.round(carousel.scrollLeft / carousel.offsetWidth)
			// 		if (this.productImagesArray && this.productImagesArray[currentIndex]) {
			// 			this.selectedImage = this.productImagesArray[currentIndex]
			// 		}
			// 	})
			// }
		})
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

		// TODO: Due to this effect, the selected variant is updated two times causing an extra render
		// Try to find a way to avoid this
		// This effect is used to set the selected variant when the page is loaded or when navigating
		// to and back from other product page
		// Can we use onNavigate() instead of this effect? but its interfering with the variant selection
		// by overwriting the selected variant as we are using goto() for variant selection
		// $effect(() => {
		// 	console.log('variant effect')
		// 	if (page.data && page.data?.product?.variants) {
		// 		const variantId = page.url.searchParams.get('variant_id')
		// 		console.log('variantId', variantId)
		// 		if (variantId) {
		// 			this.selectedVariant = page.data?.product.variants.find((v) => v.id === variantId)
		// 		} else {
		// 			this.selectedVariant = page.data?.product?.variants?.find((v) => v.title !== 'default')
		// 		}
		// 	}
		// })
	}
}

export function createProductStateContext() {
	// Use Svelte context (not a module-level static) so concurrent SSR requests don't
	// share one ProductState instance — a static _instance written during one request's
	// render is readable by another request on the server. The <ProductStateProvider>
	// wraps every consumer, so getContext/setContext resolve correctly (same as cart).
	return setContext(PRODUCT_STATE_KEY, new ProductState())
}

export function useProductState(): ProductState {
  return getContext(PRODUCT_STATE_KEY)
}
