<script module lang="ts">
	export type Breadcrumb = {
		name: string
		item?: string
	}
</script>

<script lang="ts">
	import StructuredData from "./structured-data.svelte"

	const { breadcrumbs = [] }: { breadcrumbs: Array<Breadcrumb> } = $props()

	const breadcrumbSchema: string = $derived.by(() => {
		if (breadcrumbs && breadcrumbs.length > 0) {
			return JSON.stringify(
				{
					'@context': 'https://schema.org',
					'@type': 'BreadcrumbList',
					itemListElement: breadcrumbs.map((breadcrumb, index) => ({
						'@type': 'ListItem',
						position: index + 1,
						name: breadcrumb.name,
						item: breadcrumb.item
					}))
				},
				null,
				2
			)
		}
		return ''
	})
</script>

<StructuredData schema={breadcrumbSchema} />
