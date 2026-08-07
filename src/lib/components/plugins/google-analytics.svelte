<script lang="ts">
	import { page } from '$app/state';

	const storeData = $derived(page.data.store);

	const isActive: boolean = storeData?.plugins?.googleTagManager?.active;

	// Read tags list (supporting both array and legacy single string id)
	const rawTags = storeData?.plugins?.googleTagManager?.tags;
	const legacyId = storeData?.plugins?.googleTagManager?.id;

	let tagsList: string[] = [];
	if (Array.isArray(rawTags)) {
		tagsList = rawTags.map((t: any) => (typeof t === 'string' ? t : t?.id || '')).filter(Boolean);
	} else if (typeof rawTags === 'string' && rawTags.trim()) {
		tagsList = [rawTags.trim()];
	}
	if (!tagsList.length && legacyId) {
		tagsList = [legacyId];
	}

	const conversions = storeData?.plugins?.googleTagManager?.conversions || [];

	// Separate GTM tags from standard Google Tags (G-XXXXX, AW-XXXXX, etc.)
	const gtmTag = tagsList.find((id) => id.startsWith('GTM-'));
	const normalTags = tagsList.filter((id) => !id.startsWith('GTM-'));
	const primaryGtagId = normalTags[0] || '';

	// Build config script to initialize window.__GOOGLE_TAG_CONFIG__ and all gtag configs
	const configScriptBody = normalTags
		.map((id) => {
			if (id.startsWith('G-')) {
				return `gtag('js', new Date()); gtag('config', '${id}');`;
			}
			return `gtag('config', '${id}');`;
		})
		.join('\n');

	const initConfigScript = `
    window.__GOOGLE_TAG_CONFIG__ = ${JSON.stringify({
			active: isActive,
			tags: tagsList,
			conversions
		})};
    window.dataLayer = window.dataLayer || [];
    function gtag(){ dataLayer.push(arguments); }
    ${isActive ? configScriptBody : ''}
  `;

	// gtag/js + gtm.js are ~460KB and were downloading inside the LCP window, starving the
	// product image of bandwidth on Slow 4G. The gtag() shim above queues every call into
	// dataLayer, and GTM drains that queue when it arrives, so deferring the *library* to the
	// load event loses no events — it only stops it competing with above-the-fold content.
	const deferredLoader = (src: string) => `
    (function(){
      var load = function(){
        var s = document.createElement('script');
        s.async = true;
        s.src = '${src}';
        document.head.appendChild(s);
      };
      if (document.readyState === 'complete') load();
      else addEventListener('load', load, { once: true });
    })();
  `;

	// gtm.start is pushed immediately so GTM still reports correct container timing; only the
	// container script itself waits for `load`.
	const gtmScript =
		isActive && gtmTag
			? `
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
      ${deferredLoader(`https://www.googletagmanager.com/gtm.js?id=${gtmTag}`)}
    `
			: '';
</script>

<svelte:head>
	{#if isActive}
		{@html `<script id="gtag-config">${initConfigScript}</script>`}

		{#if primaryGtagId}
			<!-- Primary Google Tag Library — injected on `load`, see deferredLoader. -->
			{@html `<script id="gtag-lib">${deferredLoader(`https://www.googletagmanager.com/gtag/js?id=${primaryGtagId}`)}</script>`}
		{/if}

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
