type LoadEvent = {
	fetch: typeof fetch
	url: URL
	params: Record<string, string>
	parent: () => Promise<Record<string, any>>
	data?: Record<string, any>
}

type ServerLoadEvent = LoadEvent & {
	cookies: {
		get: (name: string) => string | undefined
		set?: (...args: any[]) => void
		delete?: (...args: any[]) => void
	}
	locals: Record<string, any>
	request: Request
}

export type PageLoad = (event: LoadEvent) => any
export type LayoutLoad = (event: LoadEvent) => any
export type PageServerLoad = (event: ServerLoadEvent) => any
export type LayoutServerLoad = (event: ServerLoadEvent) => any
