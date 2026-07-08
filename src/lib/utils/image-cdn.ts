import { page } from '$app/state'

export function getImageCDNUrl(
  orig: string,
  width?: number | string,
  height?: number | string,
  quality?: number | string
) {
  try {
    if (!orig) return orig

    const imageCdn = page?.data?.store?.plugins?.imageCdn
    if (!imageCdn || !imageCdn.active) {
      return orig
    }

    const provider = imageCdn.provider
    const prefix = `${imageCdn.url || ''}`
    const origUrl = new URL(orig)

    if (provider === 'cloudflare') {
      const options: string[] = []
      if (width && width !== '0' && width !== 0) {
        options.push(`width=${width}`)
      }
      if (height && height !== '0' && height !== 0) {
        options.push(`height=${height}`)
      }
      options.push(`quality=${quality || 80}`)
      options.push(`format=auto`)

      const optionsStr = options.join(',')
      const base = prefix ? (prefix.endsWith('/') ? prefix : `${prefix}/`) : `${origUrl.origin}/`
      const path = origUrl.pathname.startsWith('/') ? origUrl.pathname.slice(1) : origUrl.pathname
      const query = origUrl.search

      return `${base}cdn-cgi/image/${optionsStr}/${path}${query}`
    }

    const slug = orig.replace(origUrl.origin, '').replace(/\//, '')
    const query = ``

    if (prefix.endsWith('/'))
      return `${prefix}${slug}${query}`
    else
      return `${prefix}/${slug}${query}`
  } catch (e: any) {
    console.error('Processing CDN URL', e)
    return orig
  }
}

