<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state'
	import { onMount } from 'svelte';

  const googleTagManagerPlugin = $derived(page.data.store?.plugins?.googleTagManager?.id)
	const gtagId = $derived(googleTagManagerPlugin.id)

	onMount(() => {
    if (!googleTagManagerPlugin) return

	  const isActive = googleTagManagerPlugin.active

		if (isActive && gtagId  && browser) {
			// Clean up existing scripts to avoid duplicates
			const existingLoader = document.querySelector(`script[src="https://www.googletagmanager.com/gtm.js?id=${gtagId}"]`)
			const existingConfig = document.querySelector('script#gtag-config')

			if (existingLoader) existingLoader.remove()
			if (existingConfig) existingConfig.remove()

			// Create and append loader script
			const loaderScript = document.createElement('script')
			loaderScript.src = `https://www.googletagmanager.com/gtm.js?id=${gtagId}`
			loaderScript.async = true

			// Create and append configuration script
			const configScript = document.createElement('script')
			configScript.id = 'gtag-config'
			configScript.textContent = `
        window.dataLayer = window.dataLayer || []

        function gtag() {
          dataLayer.push(arguments)
        }

        gtag('js', new Date())
        gtag('config', '${gtagId}')
      `

			document.head.appendChild(loaderScript)
			document.head.appendChild(configScript)
		}
	})
</script>

<!-- Add noscript fallback iframe for users with JavaScript disabled -->
{#if googleTagManagerPlugin.isActive && gtagId}
	<noscript>
		<iframe
			src="https://www.googletagmanager.com/ns.html?id={gtagId}"
			height="0"
			width="0"
			style="display:none;visibility:hidden"
			title="Google Tag Manager"
		></iframe>
	</noscript>
{/if}
