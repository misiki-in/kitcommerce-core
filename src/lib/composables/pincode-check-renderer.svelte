<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { useProductState } from './product';
	import OrderTimelineRenderer from './order-timeline-renderer.svelte';

	interface Props {
		pincode: string | undefined;
		content: Snippet<[SnippetParams]>;
	}

	let { content, pincode = $bindable() }: Props = $props();

	interface SnippetParams {
		resultText: string;
		loading: boolean;
		showPincode: boolean;
		hasSingleWarehouse: boolean;
		selectedWarehouse: Warehouse | null;

		checkPincode: () => void;
		toggleShowPincode: () => void;
	}

	let showPincode = $state(false);
	let resultText = $state('');
	let loading = $state(false);
	type Warehouse = {
		id: string;
		lat: number;
		lng: number;
		leadTime: number;
		[key: string]: any;
	}

  let selectedWarehouse = $state<Warehouse | null>(null)

	const productState = useProductState();

	const warehouses = $derived((productState?.warehouses || []) as Warehouse[]);
	const hasSingleWarehouse = $derived(warehouses.length === 1);

	$effect(() => {
		if (hasSingleWarehouse && warehouses[0]) {
			const leadTime = warehouses[0].leadTime || 0;

			if (leadTime > 0) {
				resultText = `Ships in ${leadTime} business days`;
        selectedWarehouse = warehouses[0]
			} else {
				resultText = '';
        selectedWarehouse = null
			}
		}
	});

	async function checkPincode() {
		if (!pincode) return;
		loading = true;

		try {
			const res = await fetch(
				`https://nominatim.openstreetmap.org/search?postalcode=${pincode}&format=json`
			);
			const data = await res.json() as Array<{ lat?: string; lon?: string }>;

			const smallest = {
				distance: Infinity,
				id: '',
				leadTime: -1
			};

			for (const result of data) {
				if (result.lat && result?.lon) {
					const userLat = Number(data[0].lat);
					const userLng = Number(data[0].lon);

					console.log(warehouses);
					console.log(userLat, userLng);

					for (const wh of warehouses) {
						const distance = distanceKm(wh.lat, wh.lng, userLat, userLng);

						if (distance < smallest.distance) {
							smallest.distance = distance;
							smallest.id = wh.id;
							smallest.leadTime = wh.leadTime;
						}
					}
				}
			}

			if (smallest.leadTime > -1) {
				resultText = `Available in your area. Ships in ${smallest.leadTime} business days`;
        selectedWarehouse = warehouses.find(x => x.id == smallest.id) ?? null
			} else {
				resultText = 'Sorry, we do not deliver to your area.';
        selectedWarehouse = null
			}
		} finally {
			loading = false;
		}
	}

	function toRad(deg: number) {
		return (deg * Math.PI) / 180;
	}

	function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
		const R = 6371;
		const dLat = toRad(lat2 - lat1);
		const dLon = toRad(lon2 - lon1);

		const a =
			Math.sin(dLat / 2) ** 2 +
			Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return R * c;
	}

	function toggleShowPincode() {
		showPincode = !showPincode;
	}
</script>

{@render content({
	loading,
	resultText,
	showPincode,
	hasSingleWarehouse,
  selectedWarehouse,
	checkPincode,
	toggleShowPincode,
})}
