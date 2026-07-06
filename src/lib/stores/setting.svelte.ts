import { getContext, onMount, setContext } from 'svelte'
import { storeService } from '$lib/services/index.js'
import { page } from '$app/state'

export class settingState {
	currencies = $state<any>([])
	countries = $state<any>([])
	states = $state<any>([])
	megamenu = $state<any>([])
	menu = $state<any>([])
	paymentMethods = $state<any>([])
	plugins = $state<any>([])
	isUpdatingSetting = $state<boolean>(false)
	selectedStore = $state<any>({})
	retrieveStoreId = () => {
		const storeId = page.data?.store?.id
		return storeId
	}

	constructor() {
		onMount(async () => {
			this.isUpdatingSetting = true
			this.listSettings()
			this.isUpdatingSetting = false
		})
	}

	async setStoreData(store: any) {
		if (!store?.id) {
			console.error('Store ID not found')
			return
		}
		this.selectedStore = store
	}

	listSettings = async () => {
		try {
			const storeId = this.retrieveStoreId()
			const storeDetails: any = await storeService.getStore(storeId)
			this.selectedStore = {
				name: storeDetails.name,
				description: storeDetails.description,
				logo: storeDetails.logo,
				currency: storeDetails.currency,
				currencyCode: storeDetails.currencyCode,
				currency_symbol_native: storeDetails.currency?.symbolNative,
				weight_unit: storeDetails.weightUnit,
				productImageAspectRatio: storeDetails.productImageAspectRatio,
				homepageSliderBannerHeight: storeDetails.homepageSliderBannerHeight,
				homePageSliderBannerImageHeight: storeDetails.homePageSliderBannerImageHeight,
				androidScheme: storeDetails.androidScheme,
				androidPackage: storeDetails.androidPackage,
				androidAppJson: storeDetails.androidAppJson,
				androidVersionCode: storeDetails.androidVersionCode,
				androidWebviewUrl: storeDetails.androidWebviewUrl,
				themePrimaryColor: storeDetails.themePrimaryColor,
				themeSecondaryColor: storeDetails.themeSecondaryColor,
				themeFontFamily: storeDetails.themeFontFamily,
				themeFontColor: storeDetails.themeFontColor,
				freeShippingOn: storeDetails.freeShippingOn,
				shippingCharges: storeDetails.shippingCharges,
				metaTitle: storeDetails.metaTitle || storeDetails.meta_title,
				metaDescription: storeDetails.metaDescription || storeDetails.meta_description,
				metaKeywords: storeDetails.metaKeywords || storeDetails.meta_keywords
			}
			this.megamenu = storeDetails.megamenu
			this.currencies = storeDetails.currencies
			this.countries = storeDetails.countries
			this.paymentMethods = storeDetails.paymentMethods
			this.plugins = storeDetails.plugins
			this.menu = storeDetails.menu
			// 	CurrencyService.listCurrencies(),
			// 	CategoryService.getMegamenu(),
			// 	CountryService.list(),
			// 	PaymentMethodService.list({}),
			// 	PluginService.list({}),
			// 	MenuService.list(),
			// 	storeId ? storeService.getStore(storeId) : Promise.reject('No store ID found')

			// // Handle each result independently
			// } else {
			// 	console.error('Failed to fetch currencies:', results[0].reason)

			// } else {
			// 	console.error('Failed to fetch megamenu:', results[1].reason)

			// } else {
			// 	console.error('Failed to fetch countries:', results[2].reason)

			// } else {
			// 	console.error('Failed to fetch payment methods:', results[3].reason)

			// } else {
			// 	console.error('Failed to fetch plugins:', results[4].reason)

			// } else {
			// 	console.error('Failed to fetch plugins:', results[5].reason)

			// } else {
			// 	console.error('Failed to fetch store:', results[6].reason)
		} catch (e) {
		}
	}
}

const SETTING_KEY = Symbol('SETTING')

export function setSettingState() {
	return setContext(SETTING_KEY, new settingState())
}

export function getSettingState() {
	return getContext<ReturnType<typeof setSettingState>>(SETTING_KEY)
}

