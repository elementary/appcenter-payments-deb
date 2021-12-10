import * as yup from 'yup'

const RDNN_SCHEMA = yup
  .string()
  .trim()
  .max(100)
  .matches(/^(?:[a-z0-9-_]+\.){2,}(?:[a-z0-9-_]+)$/i, {
    message: 'Project RDNN is not in an RDNN format'
  })

const BODY_SCHEMA = yup.object().shape({
  key: yup
    .string()
    .required()
    .trim()
    .max(255)
    .matches(/^ac_[a-z0-9]+/i),
  token: yup
    .string()
    .required()
    .trim()
    .max(255)
    .matches(/^ch_[a-z0-9]+/i),
  email: yup
    .string()
    .required()
    .trim()
    .email(),
  amount: yup
    .number()
    .required()
    .moreThan(99)
    .lessThan(100000001)
    .integer(),
  currency: yup
    .string()
    .optional()
    .oneOf(['USD'])
})

function errorResponse (
  error: {
    title: String
    detail: String
    source?: {
      parameter?: String
      pointer?: String
    }
  },
  status = 400
): Response {
  const body = {
    errors: [Object.assign({ status }, error)]
  }

  return new Response(JSON.stringify(body), { status })
}

function parseRdnn (event: FetchEvent): String {
  const parsedUrl = new URL(event.request.url)
  const pathChunks = parsedUrl.pathname.split('/')
  const lastChunk = pathChunks[pathChunks.length - 1]

  return lastChunk == null ? '' : lastChunk
}

async function parseBody (request: Request): Promise<Object> {
  const { headers } = request
  const contentTypeHeader = headers.get('content-type')
  const contentType = contentTypeHeader == null ? '' : contentTypeHeader

  if (contentType.includes('application/json')) {
    return await request.json()
  } else {
    return {}
  }
}

async function handleRequest (event: FetchEvent): Promise<Response> {
  if (event.request.method !== 'POST') {
    return errorResponse({
      title: 'Bad Method',
      detail: 'This endpoint only accepts POST requests'
    })
  }

  const projectRdnn = parseRdnn(event)
  const projectRdnnIsValid = await RDNN_SCHEMA.isValid(projectRdnn)

  if (!projectRdnnIsValid) {
    return errorResponse({
      title: 'Bad Request',
      detail: 'Project RDNN is not an RDNN format',
      source: { parameter: 'project' }
    })
  }

  if (event.request.body == null) {
    return errorResponse({
      title: 'Bad Request',
      detail: 'This endpoint requires a POST body'
    })
  }

  let payload = {}
  try {
    const body = (await parseBody(event.request)) as { data?: object }
    payload = await BODY_SCHEMA.validate(body.data, {
      abortEarly: true,
      stripUnknown: true
    })
  } catch (err) {
    if (err instanceof yup.ValidationError && err.path != null) {
      return errorResponse({
        title: 'Bad Request',
        detail: err.message,
        source: { pointer: `/data/attributes/${err.path}` }
      })
    } else if (err instanceof yup.ValidationError) {
      return errorResponse({
        title: 'Bad Request',
        detail: err.message
      })
    } else {
      return errorResponse({
        title: 'Bad Request',
        detail: 'Unable to parse JSON POST body'
      })
    }
  }

  console.log('payload', payload)

  const payloadIsValid = await BODY_SCHEMA.isValid(payload)
  if (!payloadIsValid) {
    return errorResponse({
      title: 'Bad Request',
      detail: 'Invalid JSON POST body'
    })
  }

  return new Response(JSON.stringify({ hello: 'worker' }), { status: 200 })
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event))
})
