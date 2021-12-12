import Stripe from 'stripe'
import { ZodError } from 'zod'

import { sendReceipt } from './mailer'
import { parseRequest, RequestType } from './request'
import { ResponseError } from './response'
import { createCharge } from './stripe'

async function handleRequest (event: FetchEvent): Promise<Response> {
  if (event.request.method !== 'POST') {
    return new ResponseError()
      .addError({
        title: 'Bad Method',
        detail: 'This endpoint only accepts POST requests'
      })
      .setStatus(405)
      .toResponse()
  }

  let request: RequestType = {
    rdnn: '',
    account: '',
    key: '',
    token: '',
    email: undefined,
    amount: 0,
    currency: 'USD'
  }

  try {
    request = await parseRequest(event.request)
  } catch (err) {
    console.error(`Error while parsing request: ${err}`)

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
    await createCharge(request)
  } catch (err) {
    console.error(`Error while creating Stripe charge: ${err}`)

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

  if (request.email != null) {
    event.waitUntil(
      sendReceipt(request).catch(err => {
        console.error(`Error while sending Mailgun email: ${err}`)
      })
    )
  }

  return new Response(
    JSON.stringify({
      name: request.rdnn,
      key: request.key,
      amount: request.amount
    }),
    { status: 200 }
  )
}

addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(handleRequest(event))
})
