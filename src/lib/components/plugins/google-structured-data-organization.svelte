<script lang="ts">
	import { page } from '$app/state'
	import { parseHTMLToText } from '$lib/utils/index.js';
	import StructuredData from './structured-data.svelte'

	interface Props {
		name?: string
		url?: string
		logo?: string
		image?: string
		description?: string
		foundingDate?: string
		priceRange?: string
		organizationType?: string | string[]
		contactType?: string
		contactPoint?: any
		address?: any
		sameAs?: string[]
	}

	let {
		name = '',
		url = '',
		logo = '',
		image = '',
		description = '',
		foundingDate,
		priceRange = '$$$',
		organizationType = ['Organization', 'JewelryStore'],
		contactType = 'customer service',
		contactPoint = undefined,
		address = undefined,
		sameAs = []
	}: Props = $props()

	const store = $derived(page.data.store)

	const organizationSchema = $derived.by(() => {
		const plugin = store?.plugins?.socialSharingButtons || {}
		const socialMediaLinks = sameAs && sameAs.length > 0 ? sameAs : []

		if (socialMediaLinks.length === 0) {
			for (const key in plugin) {
				if (key != 'active' && plugin[key]) socialMediaLinks.push(plugin[key])
			}
		}

		const finalContactPoint = contactPoint || {
			'@type': 'ContactPoint',
			telephone: store?.businessPhone,
			contactType: contactType,
			email: store?.businessEmail
		}

		const finalAddress = address || {
			'@type': 'PostalAddress',
			streetAddress: store?.address_1,
			addressLocality: store?.city,
			addressRegion: store?.state,
			postalCode: store?.zip,
			addressCountry: store?.country?.iso2
		}

		return JSON.stringify({
			'@context': 'https://schema.org',
			'@type': organizationType,
			'@id': `${url || page.url.origin}/#organization`,
			name: name || store?.name,
			url: url || page.url.origin,
			logo: logo || store?.logo,
			image: image || logo || store?.logo,
			description: parseHTMLToText(description || store?.description),
			foundingDate: foundingDate,
			priceRange: priceRange,
			contactPoint: finalContactPoint,
			address: finalAddress,
			sameAs: socialMediaLinks
		})
	})
</script>

<StructuredData schema={organizationSchema} />
