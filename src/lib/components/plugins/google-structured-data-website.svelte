<script lang="ts">
	import StructuredData from './structured-data.svelte'
	import { page } from '$app/state'

	const websiteSchema: string = $derived.by(() => {
		return JSON.stringify(
			{
				'@context': 'https://schema.org',
				'@type': 'WebSite',
				name: page.data.store?.name,
				description: page.data.store?.description,
				url: page.url.origin,
				publisher: {
					'@id': `${page.url.origin}/#organization`
				},
				potentialAction: {
					'@type': 'SearchAction',
					target: {
						'@type': 'EntryPoint',
						urlTemplate: `${page.url.origin}/products?search={search_term_string}`
					},
					'query-input': 'required name=search_term_string'
				}
			},
			null,
			2
		)
	})
</script>

<StructuredData schema={websiteSchema} />

