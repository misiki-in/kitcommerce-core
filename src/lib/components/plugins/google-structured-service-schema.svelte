<script lang="ts">
	import { page } from '$app/state'
	import StructuredData from './structured-data.svelte';

	const {
		serviceName,
		serviceDescription,
		serviceType,
		providerName, 
		areaServed,
	}: {
		serviceName: string
		serviceDescription: string
		serviceType?: string
		providerName?: string
		areaServed?: string
	} = $props()

	const serviceSchema = $derived.by(() => {
		return JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'Service',
			name: serviceName,
			description: serviceDescription,
			serviceType: serviceType,
			provider: {
				'@id': `${page.url.origin}/#organization`,
				'@type': 'LocalBusiness',
				name: providerName
			},
			areaServed: {
				'@type': 'Country',
				name: areaServed
			}
		})
	})
</script>

<StructuredData schema={serviceSchema} />
