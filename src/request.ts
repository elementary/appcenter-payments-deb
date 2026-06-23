import { z } from 'zod'

const messages = (required: string, invalid: string) => ({
  error: (iss: { input: unknown }) =>
    iss.input === undefined ? required : invalid
})

const RDNN_SCHEMA = z
  .string(messages(
    'Project RDNN is required',
    'Unable to parse project RDNN'
  ))
  .max(255, {
    error: 'Project RDNN must be shorter than 255 characters'
  })
  .regex(/^(?:[a-z0-9-_]+\.){2,}(?:[a-z0-9-_]+)$/i, {
    error: 'Project RDNN is not in an RDNN format'
  })
  .nonempty({
    error: 'Project RDNN is required'
  })

const ACCOUNT_SCHEMA = z
  .string(messages(
    'Unable to find Stripe account ID',
    'Error finding Stripe account ID'
  ))
  .regex(/^acct_[a-z0-9]+$/i, {
    error: 'Stripe account is must start with acc_'
  })
  .nonempty({
    error: 'Unable to find account ID from public key'
  })

const DATA_SCHEMA = z.strictObject({
  key: z
    .string(messages(
      'Stripe public key is required',
      'Unable to parse Stripe project public key'
    ))
    .max(255, {
      error: 'Stripe public key must be shorter than 255 characters'
    })
    .regex(/^pk_[a-z0-9]+$/i, {
      error: 'Stripe public key must start with pk_'
    })
    .nonempty({
      error: 'Stripe public key is required'
    }),
  token: z
    .string(messages(
      'Stripe token is required',
      'Unable to parse Stripe token'
    ))
    .max(255, {
      error: 'Stripe token must be shorter than 255 characters'
    })
    .regex(/^tok_[a-z0-9]+$/i, {
      error: 'Stripe token must start with tok_'
    })
    .nonempty({
      error: 'Stripe token is required'
    }),
  email: z
    .email({ error: 'Email must be a valid email address' })
    .optional(),
  amount: z.preprocess(
    Number,
    z
      .number(messages(
        'Amount is required',
        'Unable to parse payment amount integer'
      ))
      .int({
        error: 'Amount must be an integer'
      })
      .gte(100, {
        error: 'Amount must be more than 100'
      })
      .lte(100000000, {
        error: 'Amount must be less than 100000000'
      })
      .multipleOf(100, {
        error: 'Amount must be a multiple of 100 (a whole dollar amount)'
      })
  ),
  currency: z.enum(['USD']).default('USD')
})

export const REQUEST_SCHEMA = z.strictObject({
  ...DATA_SCHEMA.shape,
  rdnn: RDNN_SCHEMA,
  account: ACCOUNT_SCHEMA
})
export type RequestType = z.infer<typeof REQUEST_SCHEMA>

const ENVELOPE_SCHEMA = z.object({ data: z.unknown().optional() })

function parseRdnn (request: Request): string {
  const parsedUrl = new URL(request.url)
  const pathChunks = parsedUrl.pathname.split('/')
  return RDNN_SCHEMA.parse(pathChunks[pathChunks.length - 1])
}

async function parseBody (request: Request): Promise<unknown> {
  const contentType = request.headers.get('content-type') ?? ''

  const isJson =
    contentType.includes('application/json') ||
    contentType.includes('application/vnd.api+json')

  if (!isJson) return {}

  const envelope = ENVELOPE_SCHEMA.parse(await request.json())
  return envelope.data ?? {}
}

export async function parseRequest (
  request: Request,
  env: Env
): Promise<RequestType> {
  const rdnn = parseRdnn(request)
  const data = DATA_SCHEMA.parse(await parseBody(request))

  const account = ACCOUNT_SCHEMA.parse(
    await env.STRIPE_ACCOUNT_IDS.get(data.key)
  )

  return Object.assign({ account, rdnn }, data)
}
