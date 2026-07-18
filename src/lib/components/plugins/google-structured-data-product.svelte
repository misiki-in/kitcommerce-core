<script lang="ts">
	import StructuredData from './structured-data.svelte'
  import { page } from '$app/state';
	import { parseHTMLToText } from '$lib/utils/index.js';

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
	}

	const {
		product
	}: {
		product: ProductSchemaInput
	} = $props()

	const _100DaysFromNow = new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
	const productSchema: string = $derived.by(() => {
		if (!product) return ''

		// Only emit an aggregateRating when there are real reviews — Google penalizes
		// self-serving/fake review markup, and the producer's field is `ratingValue`
		// (this consumer previously read `reviewRating`, so ratings always fell back to 5).
		const reviewCount = Number(product?.aggregateRating?.reviewCount) || 0
		const ratingValue = Number(product?.aggregateRating?.ratingValue) || 0

		return JSON.stringify(
			{
				'@context': 'https://schema.org/',
				'@type': 'Product',
				name: product?.name,
				image: product?.image,
				description: parseHTMLToText(product?.description || ''),
				sku: product?.sku,
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
				offers: {
					'@type': 'Offer',
					url: product?.url,
					priceCurrency: product?.priceCurrency,
					price: product?.price,
					availability: product?.availability,
					priceValidUntil: product?.priceValidUntil || _100DaysFromNow
				},
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
