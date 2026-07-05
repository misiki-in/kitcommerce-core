import { goto } from "$app/navigation"
import { page } from "$app/state";
import { wait } from ".";

// from svelte kit docs
// TODO: replace with standard type form sveltekit
type GotoOptions = {
  replaceState?: boolean | undefined;
  noScroll?: boolean | undefined;
  keepFocus?: boolean | undefined;
  invalidateAll?: boolean | undefined;
  invalidate?:
  | (string | URL | ((url: URL) => boolean))[]
  | undefined;
  state?: App.PageState | undefined;
} | undefined

type URLResolver = (url: URL) => void

export class SerialNavigator {
  static _instance: SerialNavigator
  currentURL = new URL(page.url)

  requestResolvers: URLResolver[] = []
  isNavigating = false

  getCurrentURL = () => {
    const promise = new Promise<URL>((res) => {
      this.requestResolvers.push(res)
    })
    if (!this.isNavigating && this.requestResolvers.length == 1) {
      setTimeout(() => this.resolveURLRequest(), 500)
    }
    return promise
  }

  forceUpdateURL = (url: URL) => {
    this.currentURL = url
  }

  public resolveURLRequest = () => {
    const resolver = this.requestResolvers.shift()
    if (!resolver) return
    //onsole.log("resolved", this.currentURL)
    resolver(new URL(this.currentURL.toString()))
  }

  // only the last GotoOption will be used for navigation
  goto = async (url: URL, options?: GotoOptions) => {
    this.currentURL = url
    if (!this.requestResolvers.length)
      await wait(500)
    if (!this.requestResolvers.length) {
      this.isNavigating = true
      await goto(new URL(url.toString()), options)
      this.currentURL = page.url
      this.isNavigating = false
    }
    this.resolveURLRequest()
  }
}

export function getSerialNavigator() {
  if (SerialNavigator._instance)
    return SerialNavigator._instance
  SerialNavigator._instance = new SerialNavigator()
  return SerialNavigator._instance
}
