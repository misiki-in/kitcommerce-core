<script lang="ts">
	import { fly } from 'svelte/transition'
	import { page } from '$app/state'
	import { Email, Facebook, LinkedIn, Pinterest, Telegram, X, WhatsApp } from 'svelte-share-buttons-component'
	import facebookIcon from '$lib/assets/social-media/facebook.png'
	import gmailIcon from '$lib/assets/social-media/gmail.png'
	import linkedinIcon from '$lib/assets/social-media/linkedin.png'
	import linkIcon from '$lib/assets/social-media/link.png'
	import pinterestIcon from '$lib/assets/social-media/pinterest.png'
	import telegramIcon from '$lib/assets/social-media/telegram.png'
	import twitterIcon from '$lib/assets/social-media/twitter.png'
	import whatsappIcon from '$lib/assets/social-media/whatsapp.png'
	import { toast } from 'svelte-sonner'

	let { productImage, productName, url } = $props()

	let showDropDown = $state(false)

	let socialSharesList = [
		{
			icon: whatsappIcon,
			title: 'Whatsapp',
			dataAction: 'share/whatsapp/share',
			href: `whatsapp://send?text=${productName} ${url}`
		},
		{
			icon: telegramIcon,
			title: 'Telegram',
			href: `https://telegram.me/share/url?text=${productName}&url=${url}`
		},
		{
			icon: facebookIcon,
			title: 'Facebook',
			href: `https://facebook.com/sharer/sharer.php?u=${url}&quote=${productName}`
		},
		{
			icon: twitterIcon,
			title: 'X',
			href: `https://twitter.com/intent/tweet/?text=${productName}&hashtags=${'zapvi'}&via=${'zapvi'}&related=${'mobile cover, mousepad, phone grips, t-shirt, keychain, mobile accessories'}&url=${url}`
		},
		{
			icon: pinterestIcon,
			title: 'Pinterest',
			href: `https://pinterest.com/pin/create/button/?url=${url}&media=${productImage}&description=${productName}`
		},
		{
			icon: linkedinIcon,
			title: 'LInkedIn',
			href: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
		},
		{
			icon: gmailIcon,
			title: 'Gmail',
			href: `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${page.data.store?.email}&su=Take a look at this ${productName}&body=${url}`
		}
	]

	const copyToClipboard = (link: string) => {
		navigator.clipboard.writeText(link)

		toast.success('Copied')
	}
</script>

<div class="relative max-w-max">
	<button
		type="button"
		aria-label="Open Share Dropdown"
		class="group flex items-center gap-2 rounded-md border border-transparent px-1 py-[6px] transition duration-300 focus:outline-none lg:border-[#047769]
		{showDropDown ? 'border-primary-500 bg-black text-white shadow-lg' : 'lg:hover:border-primary-500 lg:hover:text-primary-500'}
		"
		onclick={() => (showDropDown = !showDropDown)}
	>
		<svg width="23" height="23" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path fill-rule="evenodd" clip-rule="evenodd" d="M21.2469 21.5426C21.2079 20.3837 20.2436 19.4721 19.0844 19.4981C17.9251 19.5241 17.0027 20.4782 17.0158 21.6376C17.0288 22.797 17.9724 23.7301 19.1319 23.7301C20.3198 23.7095 21.2664 22.7305 21.2469 21.5426Z" stroke="#3D3D3D" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
		<path fill-rule="evenodd" clip-rule="evenodd" d="M13.8467 14.98C13.8759 16.7623 12.4553 18.2311 10.6729 18.2612C8.89113 18.2304 7.4712 16.7618 7.50044 14.98C7.4712 13.1981 8.89113 11.7295 10.6729 11.6987C12.4553 11.7289 13.8759 13.1977 13.8467 14.98Z" stroke="#3D3D3D" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
		<path fill-rule="evenodd" clip-rule="evenodd" d="M20.1928 8.41768C20.2115 9.18578 19.8124 9.90366 19.1501 10.2932C18.4879 10.6827 17.6665 10.6827 17.0043 10.2932C16.342 9.90366 15.9429 9.18578 15.9616 8.41768C15.9429 7.64958 16.342 6.9317 17.0043 6.54216C17.6665 6.15261 18.4879 6.15261 19.1501 6.54216C19.8124 6.9317 20.2115 7.64958 20.1928 8.41768Z" stroke="#3D3D3D" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
		<path d="M17.1131 20.7073C17.4511 20.9468 17.9192 20.867 18.1587 20.5291C18.3983 20.1912 18.3185 19.7231 17.9806 19.4835L17.1131 20.7073ZM13.6056 16.3823C13.2677 16.1427 12.7995 16.2225 12.56 16.5604C12.3205 16.8983 12.4002 17.3665 12.7381 17.606L13.6056 16.3823ZM16.9969 10.4167C17.2993 10.1336 17.315 9.65897 17.0319 9.35658C16.7488 9.05419 16.2742 9.03854 15.9718 9.32161L16.9969 10.4167ZM12.6643 12.4179C12.3619 12.7009 12.3463 13.1756 12.6293 13.4779C12.9124 13.7803 13.387 13.796 13.6894 13.5129L12.6643 12.4179ZM17.5469 20.0954L17.9806 19.4835L13.6056 16.3823L13.1719 16.9941L12.7381 17.606L17.1131 20.7073L17.5469 20.0954ZM16.4844 9.86914L15.9718 9.32161L12.6643 12.4179L13.1769 12.9654L13.6894 13.5129L16.9969 10.4167L16.4844 9.86914Z" fill="#3D3D3D"/>
		</svg>

		{#if !showDropDown}
			<span class="hidden text-sm lg:group-hover:block"> Share </span>
		{:else}
			<span class="hidden text-sm lg:block">Share</span>
		{/if}
	</button>

	{#if showDropDown}
		<!-- Desktop social share buttons -->

		<ul
			transition:fly={{ y: -5, duration: 300 }}
			class="absolute right-0 top-10 z-10 hidden min-w-max list-none flex-col rounded-full border bg-white py-1 shadow-md lg:flex"
		>
			<li class="p-2">
				<WhatsApp class="flex items-center justify-center rounded-full" text="{productName} {url}" />
			</li>

			<li class="p-2">
				<Telegram class="flex items-center justify-center rounded-full" text={productName} {url} />
			</li>

			<li class="p-2">
				<Facebook class="flex items-center justify-center rounded-full" quote={productName} {url} />
			</li>

			<li class="p-2">
				<X
					class="share-button flex items-center justify-center rounded-full"
					text={productName}
					{url}
					hashtags="litekart"
					via="litekart"
					related="mobile cover,t-shirt,key chain "
				/>
			</li>

			<li class="p-2">
				<Pinterest class="flex items-center justify-center rounded-full" {url} media={productImage} description={productName} />
			</li>

			<li class="p-2">
				<LinkedIn class="flex items-center justify-center rounded-full" {url} />
			</li>

			<li class="p-2">
				<Email class="flex items-center justify-center rounded-full" subject="Take a look at this {productName}" body={url} />
			</li>
		</ul>

		<!-- Mobile social share buttons -->

		<div
			transition:fly={{ y: 100, duration: 300 }}
			class="fixed inset-x-0 bottom-0 z-[10000000] bg-white lg:hidden"
			style="box-shadow: 0px -4px 10px rgba(50, 50, 50, 0.075);"
		>
			<div class="flex items-center gap-2 px-4 py-2">
				<button type="button" aria-label="Close share dropdown" class="focus:outline-none" onclick={() => (showDropDown = false)}>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5">
						<path
							d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
						></path>
					</svg>
					<span class="sr-only">Close</span>
				</button>

				<span class="font-medium">Share</span>
			</div>

			<hr />

			<ul class="m-0 grid list-none grid-cols-4 items-end justify-items-center gap-4 p-4">
				<li class="col-span-1">
					<button
						type="button"
						class="flex max-w-max flex-col items-center justify-center gap-1 text-xs focus:outline-none"
						onclick={() => {
							copyToClipboard(`${page?.url?.href}`), (showDropDown = false)
						}}
					>
						<img src={linkIcon} alt="Link icon" class="h-8 w-auto object-contain object-center" />

						<span class="leading-3">Copy Link</span>
					</button>
				</li>

				{#each socialSharesList as ss}
					<li class="col-span-1">
						<a
							href={encodeURI(ss.href)}
							data-action={ss.dataAction || ''}
							target="_blank"
							rel="noopener noreferrer"
							class="flex max-w-max flex-col items-center justify-center gap-1 text-xs"
							onclick={() => (showDropDown = false)}
						>
							<img src={ss.icon} alt="{ss.title} icon" class="h-8 w-auto object-contain object-center" />

							<span class="leading-3">{ss.title}</span>
						</a>
					</li>
				{/each}
			</ul>
		</div>

		<button
			type="button"
			class="fixed inset-0 z-40 h-full w-full bg-black bg-opacity-0 focus:outline-none lg:z-0"
			onclick={() => (showDropDown = false)}
		>
			<span class="sr-only">Close</span>
		</button>
	{/if}
</div>
