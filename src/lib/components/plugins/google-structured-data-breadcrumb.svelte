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

	// CMS names arrive with markup and padding; a category with a blank name or no slug used to
	// emit a ListItem with no name and shift every position after it. Clean, then drop the
	// unusable entries BEFORE numbering so positions stay a contiguous 1..n.
	const cleanText = (value: unknown): string =>
		String(value ?? '')
			.replace(/<[^>]*>/g, ' ')
			.replace(/\s+/g, ' ')
			.trim()

	const items: Array<Breadcrumb> = $derived(
		(breadcrumbs.length > 0
			? breadcrumbs.map((b) => ({ name: cleanText(b.name), item: cleanText(b.item) || undefined }))
			: categoryHierarchy.map((c) => ({
					name: cleanText(c.name),
					item: cleanText(c.slug) ? `${page.url.origin}/${cleanText(c.slug).replace(/^\/+/, '')}` : undefined
				}))
		).filter((b) => Boolean(b.name && b.item))
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
