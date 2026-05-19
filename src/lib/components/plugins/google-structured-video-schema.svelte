<script lang="ts">
	import StructuredData from "./structured-data.svelte";

	const {
		name,
		description,
		thumbnailUrl,
		uploadDate,
		contentUrl,
		embedUrl,
		duration
	}: {
		name: string
		description: string
		thumbnailUrl: string
		uploadDate: string
		contentUrl?: string
		embedUrl?: string
		duration?: string
	} = $props()

	const videoSchema = $derived.by(() => {
		return JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'VideoObject',
			name,
			description,
			thumbnailUrl,
			uploadDate,
			contentUrl,
			embedUrl,
			duration
		})
	})
</script>

<StructuredData schema={videoSchema} />
