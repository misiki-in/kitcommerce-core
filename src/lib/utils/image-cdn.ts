import { page } from '$app/state'

export function getImageCDNUrl(orig: string) {
  const prefix = `${page?.data?.store?.plugins?.imageCdn?.url}`
  const origUrl = new URL(orig)

  const slug = orig.replace(origUrl.origin, '').replace(/\//, '')
  const query = ``
  //const query = `?tr=w-${w},h-${h}`
  //const query = `?tr=w-${w},h-${h},ar-${page?.data?.store?.productImageAspectRatio?.replace(':', '-')}`

  if (prefix.endsWith('/'))
    return `${prefix}${slug}${query}`
  else
    return `${prefix}/${slug}${query}`
}
