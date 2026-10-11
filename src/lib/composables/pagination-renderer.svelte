<script lang="ts">
	import { goto } from '$app/navigation'
	import { page } from '$app/state'
	import { onMount, type Snippet } from 'svelte'
	import { pageHref as hrefForPage } from '$lib/utils/index.js'

	interface Props {
		content: Snippet<[SnippetParams]>
		noOfPage: number
		paginateProducts?: () => void
	}

	const { content, noOfPage = $bindable(), paginateProducts }: Props = $props()

	interface SnippetParams {
		pageSize: number
		currentPage: number
		goToPreviousPage: () => Promise<void>
		goToNextPage: () => Promise<void>
		goToPage: (newPage: number) => Promise<void>
		/** href for page `newPage` with the other params kept, for real `<a href>` links. */
		pageHref: (newPage: number) => string
		count: number
	}

	const pageSize = 20

	// Read from the URL up front so the server render already knows the current page.
	let currentPage = $state(+(page.url.searchParams.get('page') || '1'))

	const updateCurrentPage = () => {
		const pageFromUrl = +(page.url.searchParams.get('page') || '1')
		if (pageFromUrl !== currentPage) {
			currentPage = pageFromUrl
		}
	}

	onMount(() => {
		updateCurrentPage()
	})

	$effect(() => {
		updateCurrentPage()
	})

	const goToPreviousPage = async () => {
		const newPage = Math.max(currentPage - 1, 1)
		const url = new URL(page.url)
		url.searchParams.set('page', newPage.toString())
		await goto(url, { replaceState: true, invalidateAll: true })
		if (paginateProducts) paginateProducts()
	}

	const goToNextPage = async () => {
		const newPage = Math.min(currentPage + 1, Math.ceil(noOfPage))
		const url = new URL(page.url)
		url.searchParams.set('page', newPage.toString())
		await goto(url, { replaceState: true, invalidateAll: true })
		if (paginateProducts) paginateProducts()
	}

	const goToPage = async (newPage: number) => {
		const url = new URL(page.url)
		url.searchParams.set('page', newPage.toString())
		await goto(url, { replaceState: true, invalidateAll: true })
		if (paginateProducts) paginateProducts()
	}

	// Crawlable link target, clamped to the real page range; goToPage stays the client-side path.
	const pageHref = (newPage: number) => hrefForPage(page.url, Math.min(Math.max(newPage, 1), Math.max(Math.ceil(noOfPage) || 1, 1)))

	const count = $derived(noOfPage * pageSize)

	// Update currentPage when URL changes
	$effect(() => {
		const pageFromUrl = +(page.url.searchParams.get('page') || '1')
		if (pageFromUrl !== currentPage) {
			currentPage = pageFromUrl
		}
	})
</script>

{@render content?.({ currentPage, goToNextPage, goToPage, goToPreviousPage, pageHref, pageSize, count })}
