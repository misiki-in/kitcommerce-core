import { page } from '$app/state'

export function getImageCDNUrl(orig: string) {
  try {
    const prefix = `${page?.data?.store?.plugins?.imageCdn?.url}`
    const origUrl = new URL(orig)

    const slug = orig.replace(origUrl.origin, '').replace(/\//, '')
    const query = ``

    if (prefix.endsWith('/'))
      return `${prefix}${slug}${query}`
    else
      return `${prefix}/${slug}${query}`
  } catch(e: any) {
    console.error("Processing CDN URL", e)
    return orig
  }
}
