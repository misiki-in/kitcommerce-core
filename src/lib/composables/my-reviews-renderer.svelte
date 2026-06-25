<script lang="ts">
	import { reviewService } from '@misiki/litekart-connector'
	import { onMount, type Snippet } from 'svelte'

	const { content }: { content: Snippet<[SnippetParams]> } = $props()

	interface SnippetParams {
		reviews: any
		loading: boolean
    updatePageNo: (no: number) => void
	}

	let reviews = $state(null)
	let loading = $state(true)
	let page = $state(1)

	onMount(paginateReviews)

  function updatePageNo(no: number) {
    page = no
    paginateReviews()
  }

	async function paginateReviews() {
		try {
			loading = true

			reviews = await reviewService.fetchReviews({
				currentPage: page
			})
		} catch (e: any) {
			console.error('review fetch', e)
		} finally {
			loading = false
		}
	}
</script>

{@render content?.({
	loading,
  reviews,
  updatePageNo,
})}
