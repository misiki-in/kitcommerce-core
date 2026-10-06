<script lang="ts">
	import { page } from '$app/state';
	import { browser } from '$app/environment';

	let { storeData: propStoreData } = $props<{ storeData?: any }>();
	const storeData = $derived(propStoreData || page.data?.store);

	const isActive = $derived(Boolean(storeData?.plugins?.googleTagManager?.active));

	const isValidTag = (id: string) => {
		if (!id || typeof id !== 'string') return false;
		const trimmed = id.trim();
		return /^(G|AW|GTM|GT|DC|UA)-[A-Z0-9_-]+$/i.test(trimmed);
	};

	// Read tags list (supporting array, comma-separated, or legacy single id)
	const rawTags = $derived(storeData?.plugins?.googleTagManager?.tags);
	const legacyId = $derived(storeData?.plugins?.googleTagManager?.id);

	let tagsList = $derived.by(() => {
		let list: string[] = [];
		if (Array.isArray(rawTags)) {
			list = rawTags.map((t: any) => (typeof t === 'string' ? t : t?.id || '')).filter(Boolean);
		} else if (typeof rawTags === 'string' && rawTags.trim()) {
			list = [rawTags.trim()];
		}
		if (!list.length && legacyId) {
			list = [legacyId];
		}
		return list.filter(isValidTag);
	});

	const conversions = $derived(storeData?.plugins?.googleTagManager?.conversions || []);

	// Separate GTM tags from standard Google Tags (G-XXXXX, AW-XXXXX, etc.)
	const gtmTag = $derived(tagsList.find((id) => id.startsWith('GTM-')));
	const normalTags = $derived(tagsList.filter((id) => !id.startsWith('GTM-')));
	const primaryGtagId = $derived(normalTags[0] || tagsList[0] || '');

	const configScriptBody = $derived(
		normalTags.map((id) => `gtag('config', '${id}');`).join('\n  ')
	);

	const initConfigScript = $derived(`
  window.__GOOGLE_TAG_CONFIG__ = ${JSON.stringify({
		active: isActive,
		tags: tagsList,
		conversions
	})};
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  ${isActive ? configScriptBody : ''}
`);

	const gtmScript = $derived(
		isActive && gtmTag
			? `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmTag}');`
			: ''
	);

	// Client-side synchronization: ensure window objects, gtag config, and script elements are active during SPA transitions
	$effect(() => {
		if (!browser) return;

		const win = window as any;
		win.__GOOGLE_TAG_CONFIG__ = {
			active: isActive,
			tags: tagsList,
			conversions
		};

		if (!isActive) {
			console.log('[GoogleAnalytics] Plugin is inactive.');
			return;
		}

		if (!tagsList.length) {
			console.warn('[GoogleAnalytics] Plugin is active, but no valid Google Tag IDs were found.');
			return;
		}

		win.dataLayer = win.dataLayer || [];
		if (typeof win.gtag !== 'function') {
			win.gtag = function () {
				win.dataLayer.push(arguments);
			};
		}

		// Inject single gtag.js library script if not present in DOM
		if (primaryGtagId) {
			const gtagSrc = `https://www.googletagmanager.com/gtag/js?id=${primaryGtagId}`;
			if (!document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) {
				const script = document.createElement('script');
				script.async = true;
				script.src = gtagSrc;
				document.head.appendChild(script);
			}

			win.gtag('js', new Date());

			// Configure all Google tags (GA4, Google Ads, etc.)
			for (const id of normalTags) {
				win.gtag('config', id);
			}
		}

		// Inject GTM if configured and not present in DOM
		if (gtmTag) {
			const gtmSrc = `https://www.googletagmanager.com/gtm.js?id=${gtmTag}`;
			if (!document.querySelector('script[src*="googletagmanager.com/gtm.js"]')) {
				win.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
				const script = document.createElement('script');
				script.async = true;
				script.src = gtmSrc;
				document.head.appendChild(script);
			} else {
			}
		}
	});
</script>

<svelte:head>
	{#if isActive}
		{#if primaryGtagId}
			<!-- Global site tag (gtag.js) - Google Analytics & Ads -->
			<script async src={`https://www.googletagmanager.com/gtag/js?id=${primaryGtagId}`}></script>
		{/if}

		{@html `<script id="gtag-config">${initConfigScript}</script>`}

		{#if gtmTag}
			<!-- Google Tag Manager -->
			{@html `<script id="gtm-script">${gtmScript}</script>`}
		{/if}
	{/if}
</svelte:head>

{#if isActive && gtmTag}
	<!-- Google Tag Manager (noscript) -->
	<noscript>
		<iframe
			src={`https://www.googletagmanager.com/ns.html?id=${gtmTag}`}
			height="0"
			width="0"
			style="display:none;visibility:hidden"
			title="Google Tag Manager"
		></iframe>
	</noscript>
{/if}
