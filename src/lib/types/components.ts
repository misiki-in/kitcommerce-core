import type { EmblaCarouselSvelteType } from 'embla-carousel-svelte'

export type CarouselAPI =
	NonNullable<NonNullable<EmblaCarouselSvelteType['$$_attributes']>['on:emblaInit']> extends (evt: CustomEvent<infer CarouselAPI>) => void
		? CarouselAPI
		: never

