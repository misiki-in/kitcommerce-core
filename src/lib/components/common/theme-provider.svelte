<script lang="ts">
	import { page } from '$app/state'
	import { onMount } from 'svelte'

	function updateThemeVariables() {
		const root = document.documentElement
		const store = page.data.store
		if (!store) return

		// Apply theme colors from settings if available
		if (store.themePrimaryColor) {
			root.style.setProperty('--color-theme-1', store.themePrimaryColor)
		}

		if (store.themeSecondaryColor) {
			root.style.setProperty('--color-theme-2', store.themeSecondaryColor)
		}

		if (store.themeFontColor) {
			root.style.setProperty('--color-text', store.themeFontColor)
		}

		if (store.themeFontFamily) {
			root.style.setProperty('--font-body', store.themeFontFamily)
		}
	}

	// Update whenever the selectedStore changes
	$effect(() => {
		if (page?.data?.store) {
			updateThemeVariables()
		}
	})

	onMount(() => {
		// Apply initially
		updateThemeVariables()
	})
</script>

<!-- This is a utility component with no UI -->
