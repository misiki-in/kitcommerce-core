<script module lang="ts">
	export type SchemaFAQ = {
		question: string;
		answer: string;
	};
</script>

<script lang="ts">
	import StructuredData from './structured-data.svelte';

	const {
		faqs
	}: {
		faqs: SchemaFAQ[];
	} = $props();

	let faqSchema: string = $derived.by(() => {
		if (!faqs || faqs.length === 0) return '';

		return JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'FAQPage',
			mainEntity: faqs.map((faq) => ({
				'@type': 'Question',
				name: faq.question,
				acceptedAnswer: {
					'@type': 'Answer',
					text: faq.answer
				}
			}))
		});
	});
</script>

<StructuredData schema={faqSchema} />
