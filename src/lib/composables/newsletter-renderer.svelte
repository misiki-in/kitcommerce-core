<script lang="ts">
	import { toast } from 'svelte-sonner'
	import { getUserState } from '@misiki/kitcommerce-core/stores'
	import { storeService } from '@misiki/litekart-connector'
	import { onMount, type Snippet } from 'svelte'
  import { z } from 'zod'

	let { content, email = $bindable() }: { email: string, content: Snippet<[SnippetParams]> } = $props()

	interface SnippetParams {
    loadingForSubmitting: boolean
		subscribeToNewsletter: () => void
	}

	const emailForNewsletterSchema = z.string().email()

	const userState = getUserState()
	let loadingForSubmitting = $state(false)

  onMount(async () => {
    await userState.hasLoaded
    if (userState.user?.role)
      email = userState.user.email || ''
  })

	async function subscribeToNewsletter() {
		try {
      const result = emailForNewsletterSchema.safeParse(email)
      if (!result.success)
        return toast.error(result?.error?.issues?.[0]?.message)

			loadingForSubmitting = true
			await storeService.post('/api/newsletter/subscribe', {
				email,
				customerId: userState?.user?.userId || null
			})
			toast.success('Email Subscribed')
		} catch (e: any) {
			console.error('newsletter', e)
			toast.error(e?.message || 'Operation failed')
		} finally {
			loadingForSubmitting = false
		}
	}
</script>

{@render content?.({
  loadingForSubmitting,
  subscribeToNewsletter,
})}

