<script lang="ts">
	import type { Snippet } from 'svelte'
	import { useProductState } from './product'

	interface Props {
		pincode: string | undefined
		content: Snippet<[SnippetParams]>
	}

	let { content, pincode = $bindable() }: Props = $props()

	interface SnippetParams {
		resultText: string
		loading: boolean
		showPincode: boolean
		hasSingleWarehouse: boolean

		checkPincode: () => void
		toggleShowPincode: () => void
	}

	let showPincode = $state(false)
	let resultText = $state('')
	let loading = $state(false)

	const productState = useProductState()

	const warehouses = $derived(productState?.warehouses || [])
	const hasSingleWarehouse = $derived(warehouses.length === 1)

	$effect(() => {
		if (hasSingleWarehouse && warehouses[0]) {
			const leadTime = warehouses[0].leadTime || 0

			if (leadTime > 0) {
				resultText = `Ships in ${leadTime} business days`
			} else {
				resultText = ''
			}
		}
	})

	async function checkPincode() {
		if (!pincode) return

		loading = true

		try {
			const res = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${pincode.trim()}&format=json`)
			const data = await res.json()

			const smallest = {
				distance: Infinity,
				id: '',
				leadTime: 0
			}

			if (data?.[0]?.lat && data?.[0]?.lon && data?.[0]?.display_name?.includes?.('United States')) {
				const userLat = data[0].lat
				const userLng = data[0].lon

				console.log(warehouses)

				for (const wh of warehouses) {
					const distance = distanceKm(wh.lat, wh.lng, userLat, userLng)

					if (distance < smallest.distance) {
						smallest.distance = distance
						smallest.id = wh.id
						smallest.leadTime = wh.leadTime
					}
				}
			}

			if (smallest.leadTime > 0) {
				resultText = `Available in your area. Ships in ${smallest.leadTime} business days`
			} else {
				resultText = 'Sorry, we do not deliver to your area.'
			}
		} finally {
			loading = false
		}
	}

	function toRad(deg: number) {
		return (deg * Math.PI) / 180
	}

	function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
		const R = 6371
		const dLat = toRad(lat2 - lat1)
		const dLon = toRad(lon2 - lon1)

		const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2

		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
		return R * c
	}

	function toggleShowPincode() {
		showPincode = !showPincode
	}
</script>

{@render content({
	loading,
	resultText,
	showPincode,
	hasSingleWarehouse,
	checkPincode,
	toggleShowPincode
})}
