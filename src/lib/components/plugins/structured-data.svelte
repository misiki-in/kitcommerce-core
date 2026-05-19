<script lang="ts">
	const { schema }: { schema?: string } = $props()
</script>

<svelte:head>
	{#if schema}
		{@html `
		  <script type="application/ld+json">${schema}</script>
    `}
	{/if}
</svelte:head>
