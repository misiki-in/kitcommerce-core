<script lang="ts">
	import StructuredData from './structured-data.svelte'
  import { page } from '$app/state';
	import { parseHTMLToText } from '$lib/utils/index.js';

	type Days = { min: number; max: number }

	// One child of a variant family, as assembled in ProductState.structuredData.variants.
	type SchemaVariant = {
		name?: string
		sku?: string
		url?: string
		image?: string[]
		price?: number
		availability?: string
		color?: string
		size?: string
		material?: string
	}

	// This receives the assembled structured-data object (ProductState.structuredData),
	// NOT the raw connector Product — model it as its own shape.
	type ProductSchemaInput = {
		name?: string
		image?: string[]
		description?: string | null
		sku?: string
		brandName?: string
		aggregateRating?: { ratingValue?: number; reviewCount?: number }
		url?: string
		priceCurrency?: string
		price?: number
		availability?: string
		priceValidUntil?: string
		reviews?: any[]
		productGroupID?: string
		variesBy?: string[]
		variants?: SchemaVariant[]
	}

	// One shipping option. Without the `shipping` prop, options come from the store's shipping zones.
	type ShippingInput = {
		country: string | string[]
		rate?: number
		currency?: string
		handlingDays?: Days
		transitDays?: Days
	}

	// The site's return policy. Without it no MerchantReturnPolicy is emitted: the return window
	// is a policy decision, so there is no default.
	type ReturnPolicyInput = {
		days?: number
		category?: 'MerchantReturnFiniteReturnWindow' | 'MerchantReturnNotPermitted' | 'MerchantReturnUnlimitedWindow'
		applicableCountry?: string | string[]
		returnMethod?: 'ReturnByMail' | 'ReturnInStore' | 'ReturnAtKiosk'
		returnFees?: 'FreeReturn' | 'ReturnFeesCustomerResponsibility' | 'ReturnShippingFees'
		url?: string
	}

	const {
		product,
		shipping,
		handlingDays,
		returnPolicy
	}: {
		product: ProductSchemaInput
		shipping?: ShippingInput[]
		handlingDays?: Days
		returnPolicy?: ReturnPolicyInput
	} = $props()

	const schemaEnum = (value?: string) => (value ? (value.startsWith('http') ? value : `https://schema.org/${value}`) : undefined)
	const dayRange = (d?: Days) =>
		d && Number.isFinite(d.min) && Number.isFinite(d.max) ? { '@type': 'QuantitativeValue', minValue: d.min, maxValue: d.max, unitCode: 'DAY' } : undefined

	const storeCountry = $derived.by(() => {
		const country = page.data?.store?.country
		return typeof country === 'string' ? country : country?.code || country?.iso2
	})

	// A zone rate becomes an option only when its cost for one unit is unambiguous: a flat base rate
	// with no weight, price, handling or free-over-threshold part, valid at this price.
	const storeShipping = (price?: number): ShippingInput[] => {
		const options: ShippingInput[] = []
		for (const zone of page.data?.store?.shippingZones || []) {
			const country = (zone?.countries || []).map((c: any) => c?.countryCode).filter(Boolean)
			if (zone?.active === false || !country.length) continue
			for (const rate of zone.shippingRates || []) {
				if (rate?.active === false || typeof rate?.baseRate !== 'number') continue
				if (rate.ratePerWeight || rate.ratePerPrice || rate.handlingFee) continue
				if (rate.baseRate > 0 && rate.freeShippingThreshold > 0) continue
				if (rate.methodType === 'weight' && (rate.minWeight || rate.maxWeight)) continue
				if (typeof price === 'number' && ((rate.minOrderAmount && price < rate.minOrderAmount) || (rate.maxOrderAmount && price > rate.maxOrderAmount))) continue
				options.push({
					country,
					rate: rate.baseRate,
					transitDays: { min: rate.estimatedMinDays, max: rate.estimatedMaxDays }
				})
			}
		}
		return options
	}

	const shippingDetails = (price?: number) => {
		const details = (shipping ?? storeShipping(price)).map((option) => {
			const handling = dayRange(option.handlingDays ?? handlingDays)
			const transit = dayRange(option.transitDays)
			return {
				'@type': 'OfferShippingDetails',
				shippingDestination: [option.country].flat().map((addressCountry) => ({ '@type': 'DefinedRegion', addressCountry })),
				shippingRate:
					typeof option.rate === 'number'
						? { '@type': 'MonetaryAmount', value: option.rate, currency: option.currency || product?.priceCurrency }
						: undefined,
				deliveryTime: handling || transit ? { '@type': 'ShippingDeliveryTime', handlingTime: handling, transitTime: transit } : undefined
			}
		})
		return details.length ? details : undefined
	}

	const merchantReturnPolicy = $derived.by(() => {
		if (!returnPolicy) return undefined
		const category = returnPolicy.category || ((returnPolicy.days ?? 0) > 0 ? 'MerchantReturnFiniteReturnWindow' : undefined)
		const applicableCountry = returnPolicy.applicableCountry || storeCountry
		if (!category || !applicableCountry) return undefined
		return {
			'@type': 'MerchantReturnPolicy',
			applicableCountry,
			returnPolicyCategory: schemaEnum(category),
			merchantReturnDays: category === 'MerchantReturnFiniteReturnWindow' ? returnPolicy.days : undefined,
			returnMethod: schemaEnum(returnPolicy.returnMethod),
			returnFees: schemaEnum(returnPolicy.returnFees),
			merchantReturnLink: returnPolicy.url
		}
	})

	const _100DaysFromNow = new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
	const offer = ({ url, price, availability }: { url?: string; price?: number; availability?: string }) => ({
		'@type': 'Offer',
		url,
		priceCurrency: product?.priceCurrency,
		price,
		availability: schemaEnum(availability),
		priceValidUntil: product?.priceValidUntil || _100DaysFromNow,
		shippingDetails: shippingDetails(price),
		hasMerchantReturnPolicy: merchantReturnPolicy
	})

	// $derived, not an effect, so the JSON-LD is part of the server-rendered HTML.
	const productSchema: string = $derived.by(() => {
		if (!product) return ''

		// Only emit an aggregateRating when there are real reviews — Google penalizes
		// self-serving/fake review markup, and the producer's field is `ratingValue`
		// (this consumer previously read `reviewRating`, so ratings always fell back to 5).
		const reviewCount = Number(product?.aggregateRating?.reviewCount) || 0
		const ratingValue = Number(product?.aggregateRating?.ratingValue) || 0

		// A family with a stable id is a ProductGroup whose variants carry their own name, SKU,
		// URL and offer; anything else stays a single Product.
		const isGroup = !!product?.productGroupID && !!product?.variants?.length

		return JSON.stringify(
			{
				'@context': 'https://schema.org/',
				'@type': isGroup ? 'ProductGroup' : 'Product',
				name: product?.name,
				image: product?.image,
				description: parseHTMLToText(product?.description || ''),
				brand: {
					'@type': 'Brand',
					name: product?.brandName || page.data.store?.name,
				},
				...(reviewCount > 0 && ratingValue > 0
					? {
							aggregateRating: {
								'@type': 'AggregateRating',
								ratingValue,
								reviewCount,
								ratingCount: reviewCount
							}
						}
					: {}),
				...(isGroup
					? {
							productGroupID: product.productGroupID,
							variesBy: product.variesBy?.length ? product.variesBy : undefined,
							hasVariant: product.variants?.map((v) => ({
								'@type': 'Product',
								name: v.name,
								sku: v.sku,
								image: v.image,
								color: v.color,
								size: v.size,
								material: v.material,
								offers: offer(v)
							}))
						}
					: {
							sku: product?.sku,
							offers: offer({ url: product?.url, price: product?.price, availability: product?.availability })
						}),
				review: product?.reviews?.map?.((r: any) => {
					return {
						'@type': 'Review',
						author: r?.author,
						datePublished: r?.datePublished,
						reviewBody: r?.reviewBody,
						name: r?.name,
						reviewRating: {
							'@type': 'Rating',
							bestRating: r?.reviewRating?.bestRating || '5',
							ratingValue: r?.reviewRating?.ratingValue || '5',
							worstRating: r?.reviewRating?.worstRating || '1'
						}
					}
				})
			},
			null,
			2
		)
	})
</script>

<StructuredData schema={productSchema} />
