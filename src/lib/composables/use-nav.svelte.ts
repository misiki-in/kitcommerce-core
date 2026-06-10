import { page } from '$app/state'
import { categoryService, type Menu, menuService } from '$lib/services/index.js'
import { fireGTagEvent } from '$lib/utils/gtag.js'
import { getUserState, getCartState } from '$lib/stores/index.js'
import { cubicOut } from 'svelte/easing'
import { onMount } from 'svelte'
import type { Category, StoreData } from '$lib/types/index.js'
import { goto } from '$app/navigation'

function count(...args: any[]) {
	return args.filter(Boolean).length
}

interface MegaMenuItem extends Category {
	children: MegaMenuItem[]
}

export class NavModule {
  static _instance: NavModule

	storeData = $derived(page?.data?.store as StoreData)
	cartState = getCartState()
	userState = getUserState()
	navMenu = $state<any[]>([])
	megaMenu = $state<MegaMenuItem[]>([])
	selectedCategory = $state('')
	selectedCategory2 = $state('')
	showSubCategory = $state<boolean[]>([])
	showSubCategory2 = $state<boolean[]>([])
	openSidebar = $state(false)
	scrollY = $state(0)
	isProductListingPage = $derived(String(page?.route?.id) === '/(www)/products' || String(page?.route?.id) === '/(www)/[slug]')
	navOpacity = $derived(Math.min(this.scrollY / 100, 0.95))
	navBackground = $derived(
		this.isProductListingPage
			? this.scrollY > 0
				? `md:bg-background/50 bg-background/${Math.floor(this.navOpacity * 100)} md:backdrop-blur-xl backdrop-blur-xl`
				: 'md:bg-background/50 bg-background/100 md:backdrop-blur-xl backdrop-blur-0'
			: 'bg-background/50 backdrop-blur-xl'
	)

	helloBarPlugin = $derived(this.storeData?.plugins?.hellobar)
	itemCount = $derived(count(this.helloBarPlugin?.content, this.helloBarPlugin?.content2, this.helloBarPlugin?.content3))
	animationDuration = $derived(this.itemCount * 4) // 4 seconds per item

	megaMenuPluginActive = this.storeData?.plugins?.megamenu?.active
	showAuthModal = $state(false)

	productsCount = $derived(page?.data?.products?.count || 0)
	constructor() {
    // console.log("page.data from core", page.data)
		onMount(async () => {
			try {
				const response = await menuService.list()
				const data = Array.isArray(response) ? response : []
				// Filter the menu items
				const headers = data.filter((item: any) => item?.menuId === 'header')
				if (headers && headers.length > 0) {
					this.navMenu = headers[0]?.items || []
				} else {
					console.log('Header menu not found in response')
				}
			} catch (error) {
				console.error('Error fetching menu:', error)
			}

			try {
				const response = (await categoryService.getMegamenu()) as unknown as MegaMenuItem[]
				this.megaMenu = response
				this.showSubCategory = Array<boolean>(this.megaMenu.length).fill(false)
				this.showSubCategory2 = Array<boolean>(this.megaMenu.length).fill(false)
			} catch (error) {
				console.error('Error fetching menu:', error)
			}
		})
	}

	removeCartItem = (i: number) => {
		this.cartState.remove({
			cartId: this.cartState.cart.id,
			lineId: this.cartState.cart.lineItems[i].id
		})
	}

	closeCartSidebar = (e: MouseEvent) => {
		e.stopPropagation()
		this.cartState.isOpen = false
	}

	handleContinueShoppingClick = async (e: MouseEvent) => {
		e.stopPropagation()
		this.cartState.isOpen = false
		await goto('/products')
	}

	handleSignOut = async () => {
		fireGTagEvent('logout', this.userState?.user)
		await this.userState.logout()
	}

	goBack = () => {
		history.back()
	}

	slideFadeTopRight = (node: Element, params: { delay?: number; duration?: number; easing?: any; transformOrigin?: any }) => {
		const existingTransform = getComputedStyle(node).transform.replace('none', '')

		return {
			delay: params.delay || 0,
			duration: params.duration || 400,
			easing: params.easing || cubicOut,
			css: (t: number, u: number) =>
				`transform-origin: ${params.transformOrigin || 'top right'}; transform: ${existingTransform} scaleX(${t}); opacity: ${t};`
		}
	}

	handleToggleSubCategory = (m: { name: string; children: string | any[] }, mx: number) => {
		this.selectedCategory = m.name

		if (m.children?.length > 0) {
			if (this.showSubCategory[mx] === true) {
				this.selectedCategory = ''
				this.showSubCategory[mx] = false
			} else {
				this.showSubCategory[mx] = true
			}
		}
	}

	handleToggleSubCategory2 = (c: { name: string; children: string | any[] }, cx: number) => {
		this.selectedCategory2 = c.name

		if (c.children?.length > 0) {
			if (this.showSubCategory2[cx] === true) {
				this.selectedCategory2 = ''
				this.showSubCategory2[cx] = false
			} else {
				this.showSubCategory2[cx] = true
			}
		}
	}
}
