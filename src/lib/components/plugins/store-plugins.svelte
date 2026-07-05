<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	const store = $derived(page.data.store);

	onMount(() => {
		if (!browser) return;

		if (store?.plugins?.tawkTo?.active && browser) {
			// Clean up existing scripts to avoid duplicates
			const existingLoader = document.querySelector(
				'script[src="https://cdn.reamaze.com/assets/reamaze-loader.js"]'
			);
			const existingConfig = document.querySelector('script#reamaze-config');

			if (existingLoader) existingLoader.remove();
			if (existingConfig) existingConfig.remove();

			// Create and append loader script
			const loaderScript = document.createElement('script');
			loaderScript.src = 'https://cdn.reamaze.com/assets/reamaze-loader.js';
			loaderScript.async = true;

			// Create and append configuration script
			const configScript = document.createElement('script');
			configScript.id = 'reamaze-config';
			configScript.textContent = `
    var _support = _support || { ui: {}, user: {} };
    _support.account = ${JSON.stringify(store?.plugins?.tawkTo?.account || 'secretgreen2')};
    _support.ui = {
     contactMode: 'default',
     enableKb: 'true',
     styles: {
      widgetColor: ${JSON.stringify(store?.plugins?.tawkTo?.widgetColor || 'rgba(16, 162, 197, 1)')},
      gradient: ${store?.plugins?.tawkTo?.enableGradient || true},
     },
     shoutboxFacesMode: 'default',
     shoutboxHeaderLogo: true,
     widget: {
      displayOn: 'all',
      fontSize: 'default',
      allowBotProcessing: ${store?.plugins?.tawkTo?.allowBotProcessing || true},
      slug: ${JSON.stringify(store?.plugins?.tawkTo?.slug || 'secretgreen-chat-slash-contact-form-shoutbox')},
      label: {
       text: ${JSON.stringify(store?.plugins?.tawkTo?.labelText || 'Let us know if you have any questions! &#128522;')},
       mode: 'notification',
       delay: ${store?.plugins?.tawkTo?.labelDelay || 3},
       duration: ${store?.plugins?.tawkTo?.labelDuration || 30},
       primary: ${JSON.stringify(store?.plugins?.tawkTo?.labelPrimary || 'I have a question')},
       secondary: ${JSON.stringify(store?.plugins?.tawkTo?.labelSecondary || 'No, thanks')},
       sound: ${JSON.stringify(store?.plugins?.tawkTo?.enableLabelSound || true)},
      },
      position: ${JSON.stringify(store?.plugins?.tawkTo?.widgetPosition || 'bottom-right')},
      mobilePosition: ${JSON.stringify(store?.plugins?.tawkTo?.widgetMobilePosition || 'bottom-right')},
     }
    };
    _support.apps = {
     faq: { enabled: ${store?.plugins?.tawkTo?.enableFaq || true} },
     recentConversations: {},
     orders: {},
     shopper: {}
    };
   `;

			document.head.appendChild(loaderScript);
			document.head.appendChild(configScript);
		}

		if (store?.plugins?.tidio?.active && browser) {
			// Clean up existing script to avoid duplicates
			const existingScript = document.querySelector('script[src="//code.tidio.co/"]');
			if (existingScript) existingScript.remove();

			// Create and append Tidio script
			const tidioScript = document.createElement('script');
			tidioScript.src = `//code.tidio.co/${store?.plugins?.tidio?.publicKey || ''}.js`;
			tidioScript.async = true;
			document.body.appendChild(tidioScript);
		}

		// if (store?.plugins?.plausible?.active && browser) {
		// 	// Clean up existing script to avoid duplicates
		// 	const existingScript = document.querySelector('script[src*="/js/script.js"]');
		// 	if (existingScript) existingScript.remove();

		// 	// Create and append Plausible script
		// 	const plausibleScript = document.createElement('script');
		// 	plausibleScript.src =
		// 		store?.plugins?.plausible?.script ||
		// 		'https://utilities-plausible.g5edov.easypanel.host/js/script.js';
		// 	plausibleScript.defer = true;
		// 	plausibleScript.setAttribute(
		// 		'data-domain',
		// 		store?.plugins?.plausible?.domain || 'secertgreen.com.au'
		// 	);
		// 	document.body.appendChild(plausibleScript);
		// }

		// if (store?.plugins?.umami?.active && browser) {
		// 	// Clean up existing script to avoid duplicates
		// 	const existingScript = document.querySelector('script[src*="/script.js"]');
		// 	if (existingScript) existingScript.remove();

		// 	// Create and append Umami script
		// 	const umamiScript = document.createElement('script');
		// 	umamiScript.src =
		// 		store?.plugins?.umami?.script || 'https://utilities-umami.g5edov.easypanel.host/script.js';
		// 	umamiScript.defer = true;
		// 	umamiScript.setAttribute(
		// 		'data-website-id',
		// 		store?.plugins?.umami?.websiteId || 'aac0e3f5-1766-4a9d-8c97-99852d7019cb'
		// 	);
		// 	document.body.appendChild(umamiScript);
		// }
	});
</script>
