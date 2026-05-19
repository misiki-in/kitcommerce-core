<script lang="ts">
	import StructuredData from './structured-data.svelte'
	import type { Product } from '@misiki/litekart-connector'
  import { page } from '$app/state';
	import { parseHTMLToText } from '$lib/utils/index.js';

	const {
		product
	}: {
		product: Product
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
				description: parseHTMLToText(product?.description),
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
