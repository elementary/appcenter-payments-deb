import Stripe from 'stripe'
import { ZodError } from 'zod'

import { sendReceipt } from './mailer'
import { parseRequest, RequestType } from './request'
import { ResponseError, ResponseSuccess } from './response'
import { createCharge } from './stripe'

async function handleRequest (
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  if (request.method !== 'POST') {
    return new ResponseError()
      .addError({
        title: 'Bad Method',
        detail: 'This endpoint only accepts POST requests'
      })
      .setStatus(405)
      .toResponse()
  }

  let parsed: RequestType
  try {
    parsed = await parseRequest(request, env)
  } catch (err) {
    console.error(`Error while parsing request: ${String(err)}`)

    if (err instanceof ZodError) {
      return new ResponseError().addValidationError(err).toResponse()
    } else {
      return new ResponseError()
        .addError({
          title: 'Bad Request',
          detail: 'Unable to parse JSON POST body'
        })
        .toResponse()
    }
  }

  try {
    await createCharge(parsed, env)
  } catch (err) {
    console.error(`Error while creating Stripe charge: ${String(err)}`)

    if (err instanceof Stripe.errors.StripeError) {
      return new ResponseError()
        .addStripeError(err)
        .setStatus(500)
        .toResponse()
    } else {
      return new ResponseError()
        .addError({
          title: 'Unable to process payment',
          detail:
            'An error occured while trying to process the payment with Stripe'
        })
        .setStatus(500)
        .toResponse()
    }
  }

  const { email } = parsed
  if (email != null) {
    ctx.waitUntil(
      sendReceipt({ ...parsed, email }, env).catch(err => {
        console.error(`Error while sending Mailgun email: ${String(err)}`)
      })
    )
  }

  return new ResponseSuccess({
    name: parsed.rdnn,
    key: parsed.key,
    amount: parsed.amount
  }).toResponse()
}

export default {
  fetch: handleRequest
}
