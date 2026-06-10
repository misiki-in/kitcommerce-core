<script lang="ts">
	import { page } from '$app/state'

	const styles = $derived.by(() => {
		const out: string[] = []
		const cssVariables = (page.data.store?.cssVariables || {}) as Record<string, string>
		for (const [key, value] of Object.entries(cssVariables)) {
			const formattedHsl = value.replaceAll(',', '').replace('hsl(', '').replace(')', '')
			out.push(`${key}: ${formattedHsl};`)
		}
		return out.join('\n')
	})
</script>

<svelte:head>
	{@html `<` + `style>
      :root {
        ${styles}
      }
  </` + `style>`}
</svelte:head>
