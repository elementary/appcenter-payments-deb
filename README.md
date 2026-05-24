# appcenter-payments-deb

Cloudflare Worker that processes AppCenter payments for older `.deb`-packaged apps. Receives a Stripe token and amount from the AppCenter client, splits the charge between the developer, elementary, and Stripe, and emails the buyer a receipt via Mailgun.

Live route: `developer.elementary.io/api/payment/*`

## Development

Requires Node `>=24`.

```sh
npm install
npm start          # wrangler dev — local server on http://localhost:8787
npm run typecheck  # tsc --noEmit (auto-runs `wrangler types` first)
npm run lint       # eslint
npm run format     # eslint --fix
npm run build      # wrangler deploy --dry-run --outdir=dist
```

Dev vars (Stripe/Mailgun stubs) live in `wrangler.toml` under `[vars]` and are used automatically by `wrangler dev`. They are placeholders; not real keys.

## Deploy

Pushes to `main` deploy automatically via `.github/workflows/deploy.yml`. The workflow uses the `CF_API_TOKEN` GitHub Actions secret.

To deploy manually:

```sh
npm run deploy     # wrangler deploy --env production
```

## Required secrets

Set via `wrangler secret put <name> --env production`:

| Secret              | Purpose                                                                |
| ------------------- | ---------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY` | Stripe platform secret key. Validated at request entry; missing → 500. |
| `MAILGUN_USERNAME`  | Mailgun HTTP API username (`api`).                                     |
| `MAILGUN_API_KEY`   | Mailgun API key for `mg.elementary.io`.                                |

Also required (configured in `wrangler.toml`, not secret):

- `STRIPE_API_VERSION` — pinned Stripe API version.
- `STRIPE_ACCOUNT_IDS` KV namespace — maps a Stripe publishable key (`pk_...`) to the connected Stripe account ID (`acct_...`).

## Usage

### Endpoint

```
POST https://developer.elementary.io/api/payment/<rdnn>
Content-Type: application/json
```

`<rdnn>` is the reverse-domain-name identifier of the project being paid for (e.g. `io.elementary.code`). It must be at least three dot-separated segments.

### Request body

```json
{
  "data": {
    "key": "pk_live_...",
    "token": "tok_...",
    "email": "buyer@example.com",
    "amount": 500,
    "currency": "USD"
  }
}
```

| Field      | Type     | Required | Notes                                                                 |
| ---------- | -------- | -------- | --------------------------------------------------------------------- |
| `key`      | string   | yes      | Stripe publishable key (`pk_...`). Looked up in `STRIPE_ACCOUNT_IDS`. |
| `token`    | string   | yes      | Stripe card token (`tok_...`).                                        |
| `amount`   | integer  | yes      | Cents. Must be a multiple of 100, between 100 and 100 000 000.        |
| `email`    | string   | no       | If present, a Mailgun receipt is sent.                                |
| `currency` | `"USD"`  | no       | Defaults to `USD`. Only USD accepted today.                           |

### Fee split

For an `amount` of `N` cents:

- Stripe: `ceil(N * 0.029 + 30)`
- elementary: `ceil(N * 0.30)`, floored at 50
- Developer: `N − elementary − stripe` (must be ≥ 0; the worker throws otherwise)

### Successful response

`200 OK`, `Content-Type: application/vnd.api+json`:

```json
{
  "name": "io.elementary.code",
  "key": "pk_live_...",
  "amount": 500
}
```

### Error responses

All errors use the JSON:API error shape, `Content-Type: application/vnd.api+json`:

```json
{
  "errors": [
    {
      "code": "invalid_format",
      "title": "Validation Error",
      "detail": "Stripe public key must start with pk_",
      "source": { "pointer": "data/attributes/key" }
    }
  ]
}
```

| Status | When                                                                  |
| ------ | --------------------------------------------------------------------- |
| 400    | Request body fails validation (Zod) or content-type is not JSON.      |
| 405    | Non-POST method.                                                      |
| 500    | `STRIPE_SECRET_KEY` not configured, or Stripe returned an error.      |
