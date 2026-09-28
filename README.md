# LOLScript.store

Static storefront (Node.js / Vercel) for three undetected League of Legends products:

- **LoL Script**
- **LoL Vanguard Emulator**
- **LoL Perm Spoofer**

Prices are pulled live from **Sellhub** through a serverless function, so the API token stays server-side and never reaches the browser.

## Project structure

```
.
├── api/
│   ├── prices.js        # Sellhub price proxy (reads env vars, returns live prices)
│   └── analytics.js     # no-op analytics sink (204), swap for real storage if needed
├── public/              # static site (served as the web root)
│   ├── index.html
│   ├── lol-mmr-checker.html
│   ├── lol-tier-list.html
│   ├── lol-champion-builds.html
│   ├── setup-guide.html / status.html / contact.html
│   ├── data.js          # all site content + 3 products (fallback prices)
│   ├── script.js        # renders products + fetches /api/prices
│   └── assets/
├── serve.mjs            # local static preview (no API)
├── vercel.json          # cleanUrls + headers
├── package.json
└── .env.example
```

## Deploy to Vercel

1. Push this folder to a Git repo and import it in Vercel (framework preset: **Other**).
2. Vercel serves `public/` as static and `api/*.js` as serverless functions automatically.
3. Add the environment variables below, then deploy.
4. Point your domain **lolscript.store** at the Vercel project.

### Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | Required | Description |
|---|---|---|
| `SELLHUB_API_TOKEN` | yes | Sellhub Seller API token. |
| `SELLHUB_STORE_URL` | recommended | Your store base URL, e.g. `https://your-store.sellhub.cx` (used for Buy links / fallback). |
| `SELLHUB_LOL_SCRIPT_ID` | yes | Sellhub product id for **LoL Script**. |
| `SELLHUB_VANGUARD_ID` | yes | Sellhub product id for **LoL Vanguard Emulator**. |
| `SELLHUB_SPOOFER_ID` | yes | Sellhub product id for **LoL Perm Spoofer**. |

If the token or product ids are missing, `/api/prices` returns safe fallback prices
(defined in `api/prices.js`) so the storefront never looks broken.

## How pricing works

1. `data.js` renders the 3 products with fallback prices immediately (good for SEO / no-JS).
2. `script.js` calls `GET /api/prices`.
3. `api/prices.js` calls Sellhub with `SELLHUB_API_TOKEN` and returns
   `{ products: { "lol-script": { price, currency, url }, ... } }`.
4. The page updates each price and points the **Buy Now** button to the Sellhub product URL.

Slug ↔ env mapping lives in `PRODUCT_MAP` inside `api/prices.js`.

> Note: the exact Sellhub price/variant field can vary per store. `pickPrice()` already
> checks `variants[].price`, `priceSlash`, `price`, and `cheapestSubscription`. If your
> prices show as fallback after adding env vars, check the Sellhub product response shape
> and adjust `pickPrice()`.

## Local development

```bash
# static preview only (no /api):
npm run dev          # http://localhost:8080

# full preview with serverless functions:
npx vercel dev
```

## Notes

- Checkout is handled entirely by Sellhub (no card/crypto logic in this repo).
- Tools (MMR Checker, Tier List, Champion Builds) are 100% client-side and need no backend.
- `robots.txt`, `sitemap.xml`, and canonical URLs use `https://www.lolscript.store`.



