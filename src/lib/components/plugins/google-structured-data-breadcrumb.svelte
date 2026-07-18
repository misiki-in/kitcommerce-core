<script module lang="ts">
	export type Breadcrumb = {
		name: string
		item?: string
	}
</script>

<script lang="ts">
	import { page } from '$app/state'
	import StructuredData from "./structured-data.svelte"

	// Accept either ready-made `breadcrumbs` (PDP) or a raw `categoryHierarchy` of
	// { name, slug } (listing) — mapping the latter here so the two call sites cannot
	// diverge (the listing used to pass `categoryHierarchy` to a `breadcrumbs`-only prop
	// and silently emitted no schema).
	const {
		breadcrumbs = [],
		categoryHierarchy = []
	}: {
		breadcrumbs?: Array<Breadcrumb>
		categoryHierarchy?: Array<{ name: string; slug?: string }>
	} = $props()

	const items: Array<Breadcrumb> = $derived(
		breadcrumbs.length > 0
			? breadcrumbs
			: categoryHierarchy.map((c) => ({
					name: c.name,
					item: c.slug ? `${page.url.origin}/${c.slug}` : undefined
				}))
	)

	const breadcrumbSchema: string = $derived.by(() => {
		if (items && items.length > 0) {
			return JSON.stringify(
				{
					'@context': 'https://schema.org',
					'@type': 'BreadcrumbList',
					itemListElement: items.map((breadcrumb, index) => ({
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
