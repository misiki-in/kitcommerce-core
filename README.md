# KitCommerce Configuration Documentation

This document provides a comprehensive reference for the `kitcommerce.config.ts` file, which is used as the core configuration for the storefront.

## Default Export

The default export is an object containing the storefront's configuration.

### Store Details

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique identifier for the store. |
| `name` | `string` | The display name of the store. |
| `slug` | `string` | The URL slug of the store. |
| `description` | `string` | A brief description of the store. |
| `logo` | `string` | URL to the store's logo image. |
| `favicon` | `string` | URL to the store's favicon. |

### Business Information

| Field | Type | Description |
| :--- | :--- | :--- |
| `businessName` | `string` \| `null` | The registered business name. |
| `businessLegalName` | `string` \| `null` | The legal entity name. |
| `businessEmail` | `string` \| `null` | Primary contact email. |
| `businessPhone` | `string` \| `null` | Primary contact phone number. |

### Store Settings & Display

| Field | Type | Description |
| :--- | :--- | :--- |
| `productImageAspectRatio` | `string` | Aspect ratio for product images across the storefront. |
| `currencyCode` | `string` | Default currency code (e.g., ISO 4217). |
| `loginType` | `"EMAIL"` \| `"PHONE"` \| `"BOTH"` | Determines how users can log in to the storefront. |
| `isEmailMandatory` | `boolean` | Requires users to provide an email during checkout/registration. |
| `isPhoneMandatory` | `boolean` | Requires users to provide a phone number. |

### Address & Location

| Field | Type | Description |
| :--- | :--- | :--- |
| `address_1` | `string` | Primary business address line. |
| `address_2` | `string` \| `null` | Secondary business address line. |
| `city` | `string` \| `null` | City of the business address. |
| `state` | `string` \| `null` | State or province. |
| `zipCode` | `string` \| `null` | Postal or ZIP code. |
| `country` | `Object` | Details about the country. |
| `lat` | `number` | Latitude for the physical store/headquarters. |
| `lng` | `number` | Longitude for the physical store/headquarters. |

### Theming (`cssVariables`)

An object defining CSS custom properties used to theme the storefront. Values are typically HSL color formats.

```javascript
{
  "--primary": "hsl(243, 40%, 26%)",
  "--accent": "hsl(255, 35%, 65%)",
  // ...
}
```

### Navigation (`menu`)

- **`menu`**: An array of objects defining the site's navigation structures (like the header and footer). Each object can contain nested `items`.

**Example Syntax:**
```javascript
"menu": [
  {
    "name": "Header",
    "menuId": "header",
    "link": null,
    "items": [
      {
        "link": "/",
        "name": "Home",
        "items": []
      },
      {
        "link": "/engagement",
        "name": "Engagement",
        "items": [
          {
            "link": "/engagement-shop-by-style",
            "name": "Shop By Style",
            "items": [
              {
                "link": "/engagement-shop-by-style-solitaire-rings",
                "name": "Solitaire Rings",
                "items": [],
                "thumbnail": "https://static.varnijewels.com/.../solitaire.jpeg"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "name": "Footer",
    "menuId": "footer",
    "link": null,
    "items": [
      {
        "id": "5Eso6jtv2sIhPkUf5PJCM",
        "link": "",
        "name": "Useful Links",
        "items": [
          {
            "id": "iptHWOoeXjd3OMSICuuc9",
            "link": "/my/profile",
            "name": "My Profile"
          },
          {
            "id": "3Yss7Ke-4jJ1mSOFE_baB",
            "link": "/my/wishlist",
            "name": "Wishlist"
          },
          {
            "id": "7BLRH-zvQnAaBbomEgLOP",
            "link": "/faqs",
            "name": "FAQs"
          }
        ]
      }
    ]
  }
]
```

### Currency (`currency`)

Detailed configuration for the storefront's display currency.

| Field | Type | Description |
| :--- | :--- | :--- |
| `code` | `string` | ISO currency code. |
| `decimalDigits` | `string` | Number of decimal places to display. |
| `rounding` | `string` | Currency rounding rules. |
| `symbol` | `string` | Currency symbol. |
| `symbolNative` | `string` | Native currency symbol. |
| `includesTax` | `boolean` | Indicates if product prices already include tax. |

### Plugins Configuration

The `plugins` object controls various feature flags and integrations for the storefront. Note that most of these are configured as an object with an `active` boolean flag.

**Example Syntax:**
```javascript
{
  "isProductReviewsAndRatings": {
    "active": true
  },
  "socialSharingButtons": {
    "reddit": "",
    "twitter": "",
    "facebook": "",
    "instagram": "",
    "youtube": "",
    "telegram": "",
    "snapchat": "",
    "linkedin": "",
    "pinterest": "",
    "active": true
  }
}
```

| Plugin | Description |
| :--- | :--- |
| `isAbandonnedCart` | Toggles abandoned cart recovery features. |
| `isProductFeeds` | Enables generation of product feeds (e.g., for Google Shopping). |
| `isProductReviewsAndRatings` | Enables customer reviews and ratings on products. |
| `isSecureCatalogue` | Toggles protection on the product catalogue. |
| `isShortCode` | Enables shortcodes in CMS content. |
| `isSitemap` | Generates a sitemap.xml for SEO. |
| `isDisplayQrCode` | Toggles QR code displays. |
| `isWishlist` | Allows users to save products to a wishlist. |
| `isGDPR` | Enables GDPR compliance banners and features. |
| `isReel` | Toggles short-form video features (reels). |
| `imageCdn` | Configuration for an external Image CDN provider. |
| `isGST` | Enables GST tax calculation features (often for India/Australia). |
| `isImportExport` | Enables product/data import and export capabilities. |
| `isDiscountCoupons` | Enables coupon codes and discounts. |
| `isDeals` | Toggles special deals/flash sales sections. |
| `isCollections` | Enables product collections/categories. |
| `allowBackOrder` | Allows customers to purchase items that are out of stock. |
| `enableFulfillment` | Toggles order fulfillment tracking and statuses. |
| `isDigitalProducts` | Enables the sale of digital downloads. |
| `googleAnalytics` | Configuration object for Google Analytics integration. |
| `googleTagManager` | Configuration object for Google Tag Manager (GTM). |
| `facebookPixel` | Configuration object for Meta/Facebook Pixel tracking. |
| `hellobar` | Enables an announcement bar at the top of the site. |
| `socialSharingButtons` | Adds share buttons to product pages. |
| `whatsappChatButton` | Adds a WhatsApp floating chat widget. |
| `storeClose` | Toggles the site into a "store closed" state. |
| `isMultiVendor` | Enables multi-vendor marketplace features. |
| `isBulkOrder` | Enables bulk/wholesale order features. |
| `isIndianPincodes` | Validates delivery locations based on Indian PIN codes. |
| `isHyperlocal` | Enables hyperlocal delivery zones and availability. |
| `isNilStockListing` | Determines if out-of-stock items still show in product lists. |
| `isTags` | Enables product tagging functionality. |
| `isGuestCheckout` | Allows users to purchase without registering an account. |
| `isPartialCheckout` | Allows partial payments or deposits. |
| `storePromoVideo` | Enables a promotional video block. |
| `liveStreaming` | Toggles live shopping / streaming features. |
| `protectedCatalogue` | Hides pricing or products from unregistered users. |
| `orderProcessing` | Toggles advanced order processing workflows. |
| `storeTiming` | Enables delivery slot selection or business operating hours enforcement. |
| `b2b` | Enables B2B specific features (wholesale pricing, quotes). |
| `trustPilot` | Integration with Trustpilot for reviews. |
| `tawkTo` | Integration with Tawk.to live chat. |
| `tidio` | Integration with Tidio live chat. |
| `recentPurchasePopup` | Shows "someone just bought this" notifications. |
| `megamenu` | Toggles the frontend mega-menu display feature. |
| `plausible` | Integration with Plausible Analytics. |
| `umami` | Integration with Umami Analytics. |
| `klaviyo` | Integration with Klaviyo for email marketing. |
| `returnAndExchange` | Toggles RMA (Return Merchandise Authorization) workflows. |
| `googleReviewsOptIn` | Enables Google Customer Reviews opt-in at checkout. |
| `headerScripts` | Allows injecting custom scripts into the `<head>`. |
| `search` | Configuration for the site's search bar. |
| `newsletter` | Toggles newsletter signup forms. |
| `enquiryMode` | Replaces the "Add to Cart" button with "Inquire Now". |
| `footerSettings` | Configuration for footer layout and behavior. |
| `jewelryCommerce` | Toggles specific features for jewelry stores (e.g., metal weight, bails). |
| `fnb` | Toggles Food & Beverage specific features (e.g., variants, add-ons). |
| `storeClosed` | Explicit boolean flag for storefront accessibility. |
| `productCustomizer` | Toggles custom product personalization inputs. |
| `trustBadges` | Displays payment/security trust badges. |
| `warehouse` | Toggles multi-warehouse inventory capabilities. |
| `newsTicker` | Adds a scrolling news ticker. |
| `instagramProducts` | Enables integration to pull/display Instagram posts featuring products. |

### Other Configurations

- **`workingHours`**: An object containing an array of `days` and operating times that define the business's schedule.

**Example Syntax:**
```javascript
"workingHours": {
  "days": [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday"
  ],
  "openTime": "08:00:00",
  "closeTime": "18:00:00"
}
```

---
## Services Export

The configuration file also re-exports services from `@misiki/litekart-connector`, making API and data connector functions available directly from the store configuration module:

```javascript
export * as services from "@misiki/litekart-connector"
```

