import type { RequestHandler } from '@sveltejs/kit'

/**
 * Serves /robots.txt for a Litekart storefront.
 *
 * The rules every store had before this were Shopify boilerplate: they blocked `/cart` (this
 * platform checks out at `/checkout`), `/policies` and `/blogs` (neither route exists here), and
 * missed every facet parameter the listing actually produces.
 *
 * `?page=` stays crawlable on purpose — it is the discovery path to the catalogue. The facet,
 * sort and search params are excluded because canonicals already point them back at the base
 * listing, so crawling them only burns budget.
 *
 * @param sitemapUrl Absolute sitemap URL, or a builder given the request host. Stores differ:
 *                   some serve /sitemap.xml, others proxy an S3 sitemap index.
 */
export function robotsTxt(sitemapUrl: string | ((host: string) => string)): RequestHandler {
	return async ({ url }) => {
		const sitemap = typeof sitemapUrl === 'function' ? sitemapUrl(url.host) : sitemapUrl

		const body = `# we use Litekart as our ecommerce platform

User-agent: *
# Account, checkout and transactional flows — no crawl value
Disallow: /checkout/
Disallow: /my/
Disallow: /auth/
Disallow: /profile
Disallow: /wishlist
Disallow: /messages
Disallow: /order-tracking
Disallow: /subscription-success
Disallow: /api/
Disallow: /health
# Facets, sort and search: canonicals already point these back to the base listing,
# so keep them out of the crawl. Pagination (?page=) stays crawlable — it is the
# discovery path for products.
Disallow: /*?*attributes.
Disallow: /*?*sort=
Disallow: /*?*priceFrom=
Disallow: /*?*priceTo=
Disallow: /*?*tags=
Disallow: /*?*search=
Sitemap: ${sitemap}

# Explicitly allow AI agents to crawl for search and citation
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

# Third-party SEO crawlers: throttle rather than block — they hammer a large catalogue
User-agent: AhrefsBot
Crawl-delay: 10

User-agent: AhrefsSiteAudit
Crawl-delay: 10

User-agent: SemrushBot
Crawl-delay: 10

User-agent: MJ12bot
Crawl-delay: 10`

		return new Response(body, {
			headers: {
				'Content-Type': 'text/plain'
			}
		})
	}
}
