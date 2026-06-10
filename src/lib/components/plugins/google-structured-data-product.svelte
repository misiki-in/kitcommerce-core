<script lang="ts">
	import StructuredData from './structured-data.svelte'
  import { page } from '$app/state';
	import { parseHTMLToText } from '$lib/utils/index.js';

	type StructuredProduct = {
		name?: string
		image?: string | string[]
		description?: string | null
		sku?: string | null
		brandName?: string | null
		aggregateRating?: {
			reviewRating?: number
			reviewCount?: number
		}
		url?: string
		priceCurrency?: string
		price?: number
		availability?: string
		priceValidUntil?: string | null
		reviews?: Array<{
			author?: string
			datePublished?: string
			reviewBody?: string
			name?: string
			reviewRating?: {
				bestRating?: string
				ratingValue?: string
				worstRating?: string
			}
		}>
	}

	const {
		product
	}: {
		product: StructuredProduct
	} = $props()

	const _100DaysFromNow = new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
	const productSchema: string = $derived.by(() => {
		if (!product) return ''

		return JSON.stringify(
			{
				'@context': 'https://schema.org/',
				'@type': 'Product',
				name: product?.name,
				image: product?.image,
				description: parseHTMLToText(product?.description ?? ''),
				sku: product?.sku,
				brand: {
					'@type': 'Brand',
					name: product?.brandName || page.data.store?.name,
				},
				aggregateRating: {
					'@type': 'AggregateRating',
					ratingValue: product?.aggregateRating?.reviewRating || 5,
					ratingCount: product?.aggregateRating?.reviewCount || 1,
					reviewCount: product?.aggregateRating?.reviewCount ? undefined : product?.aggregateRating?.reviewCount || 1
				},
				offers: {
					'@type': 'Offer',
					url: product?.url,
					priceCurrency: product?.priceCurrency,
					price: product?.price,
					availability: product?.availability,
					priceValidUntil: product?.priceValidUntil || _100DaysFromNow
				},
				review: product?.reviews?.map?.((r) => {
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
