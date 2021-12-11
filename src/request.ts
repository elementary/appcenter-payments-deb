import { z } from 'zod'

const RDNN_SCHEMA = z
  .string()
  .max(255, {
    message: 'Project RDNN must be shorter than 255 characters'
  })
  .regex(/^(?:[a-z0-9-_]+\.){2,}(?:[a-z0-9-_]+)$/i, {
    message: 'Project RDNN is not in an RDNN format'
  })
  .nonempty({
    message: 'Project RDNN is required'
  })

const DATA_SCHEMA = z
  .object({
    key: z
      .string()
      .max(255, {
        message: 'Stripe account key must be shorter than 255 characters'
      })
      .regex(/^pk_[a-z0-9]+/i, {
        message: 'Stripe account key must start with pk_'
      })
      .nonempty({
        message: 'Stripe account key is required'
      }),
    token: z
      .string()
      .max(255, {
        message: 'Stripe token must be shorter than 255 characters'
      })
      .regex(/^tok_[a-z0-9]+/i, {
        message: 'Stripe token must start with tok_'
      })
      .nonempty({
        message: 'Stripe token is required'
      }),
    email: z
      .string()
      .email({
        message: 'Email must be a valid email address'
      })
      .optional(),
    amount: z.preprocess(
      Number,
      z
        .number()
        .int({
          message: 'Amount must be an integer'
        })
        .gte(100, {
          message: 'Amount must be more than 100'
        })
        .lte(100000000, {
          message: 'Amount must be less than 100000000'
        })
        .multipleOf(100, {
          message: 'Amount must be a multiple of 100 (a whole dollar amount)'
        })
    ),
    currency: z.enum(['USD']).default('USD')
  })
  .strict()

export const REQUEST_SCHEMA = z.intersection(
  z.object({ rdnn: RDNN_SCHEMA }),
  DATA_SCHEMA
)
export type RequestType = z.infer<typeof REQUEST_SCHEMA>

function parseRdnn (request: Request): string {
  const parsedUrl = new URL(request.url)
  const pathChunks = parsedUrl.pathname.split('/')
  const lastChunk = pathChunks[pathChunks.length - 1]

  return lastChunk == null ? '' : lastChunk
}

async function parseBody (request: Request): Promise<Object> {
  const { headers } = request
  const contentTypeHeader = headers.get('content-type')
  const contentType = contentTypeHeader == null ? '' : contentTypeHeader

  if (contentType.includes('application/json') || contentType.includes('application/vnd.api+json')) {
    // Needed for typescript to build
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const jsonBody = (await request.json()) as { data?: object }
    return jsonBody.data == null ? {} : jsonBody.data
  } else {
    return {}
  }
}

export async function parseRequest (request: Request): Promise<RequestType> {
  const rdnn = RDNN_SCHEMA.parse(parseRdnn(request))
  const data = DATA_SCHEMA.parse(await parseBody(request))

  return Object.assign({ rdnn }, data)
}
