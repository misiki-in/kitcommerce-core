<script lang="ts">
	import { page } from '$app/state'
	import { toast } from 'svelte-sonner'
	import { onMount, type Snippet } from 'svelte'

	let menuItems: any[] = $state([])
  let headerItems = $derived(page.data.store?.menu?.find(x => x.menuId === 'header')?.items)
	let selectedCategory = $state('')
	let toggleMenuItemChildren = $state<boolean[]>([])

	interface Props {
		content: Snippet<[SnippetParams]>
	}

	const { content }: Props = $props()

	interface SnippetParams {
		selectedCategory: string
		toggleMenuItemChildren: boolean[]
		menuItems: any[]
    headerItems: any[]
		openChildMenu: (categoryName: string, index: number) => void
		closeChildMenu: (index: number, closeCategory: boolean) => void
	}

	onMount(() => {
		getMegaMenu()
	})

	async function getMegaMenu() {
		try {
			menuItems = await page?.data?.store.megamenu
		} catch (e: any) {
			toast.error(e.message)
		} finally {
		}
	}

	function openChildMenu(categoryName: string, index: number) {
		selectedCategory = categoryName
		toggleMenuItemChildren[index] = true
	}

	function closeChildMenu(index: number, closeCategory: boolean) {
		if (closeCategory) selectedCategory = ''
		toggleMenuItemChildren[index] = false
	}
</script>

{@render content({ menuItems, headerItems, toggleMenuItemChildren, selectedCategory, openChildMenu, closeChildMenu })}
