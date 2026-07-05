import { chatService, userService } from '$lib/services/index.js'
import { onMount } from 'svelte'
import { toast } from 'svelte-sonner'

export class MessagesModule {
  static _instance: MessagesModule

	allChats: any[] = $state([])
	filteredAllChats: any[] = $state([])
	chatsCount = 0
	loading = $state(false)
	me: Record<string, any> = $state({})
	err: any = $state(null)
	newMessage = $state({ message: '', img: '' })
	searchValue = $state('')
	selectedChat: any = $state({})
	showChatInbox = $state(false)
	loadingForChats = $state(false)
	desktopScrollRef: HTMLDivElement | null = $state(null)
	mobileScrollRef: HTMLDivElement | null = $state(null)

	constructor() {
		onMount(async () => {
			this.handleDisplayChats()
		})

		$effect(() => {
			if (this.allChats?.length && this.searchValue) {
				this.filteredAllChats = this.allChats.filter((c) => {
					return c?.chat?.businessName?.toLowerCase().indexOf(this.searchValue?.toLowerCase()) !== -1
				})
			} else {
				this.filteredAllChats = this.allChats
			}
		})
	}
	handleDisplayChats = async () => {
		this.loadingForChats = true
		this.showChatInbox = true
		await this.getMe()
		await this.getAllChats()
		this.loadingForChats = false
	}

	getMe = async () => {
		try {
			this.err = null
			this.loading = true

			this.me = await userService.getMe()
		} catch (e) {
			this.err = e
			toast.error((e as any)?.message)
		} finally {
			this.loading = false
		}
	}

	getAllChats = async (hideLoading = false) => {
		try {
			this.err = null
			if (!hideLoading) this.loading = true

			this.allChats = await chatService.list()
		} catch (e) {
			this.err = e
			toast.error((e as any)?.message)
		} finally {
			if (!hideLoading) this.loading = false
		}
	}

	handleSelectedChatInbox = async (chat: Record<string, any>) => {
		this.selectedChat = chat
	}

	sendMessage = async (e: Event) => {
		e.preventDefault()
		if (this.newMessage?.message) {
			try {
				this.err = null
				this.loading = true

				const messageToSend = {
					message: this.newMessage.message,
					fromUser: {
						id: this.me?.id
					},
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					id: new Date().getTime()
				}
				this.selectedChat.messages = [...this.selectedChat.messages, { message: messageToSend }]
				if (this.desktopScrollRef) this.scrollToBottom(this.desktopScrollRef)
				if (this.mobileScrollRef) this.scrollToBottom(this.mobileScrollRef)

				const res = await chatService.save({
					img: this.newMessage.img,
					message: this.newMessage.message,
					vendorId: this.selectedChat.vendorId,
					chat_id: this.selectedChat.id
				})

				this.selectedChat = this.allChats.filter((c) => this.selectedChat.user?.id === c.user?.id)[0]
			} catch (e) {
				this.err = e
				toast.error((e as any)?.message)
			} finally {
				this.loading = false
			}
		}
	}

	scrollToBottom = (ref: HTMLElement) => {
		if (ref) ref.scrollTop = ref?.scrollHeight
	}
}

