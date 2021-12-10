// import Stripe from 'stripe'
import { ZodError } from 'zod'

import { parseRequest, RequestType } from './request'
import { ResponseError } from './response'

// declare const STRIPE_SECRET_KEY: string

// const stripe = new Stripe(STRIPE_SECRET_KEY, {
//  apiVersion: '2020-08-27'
// })

async function handleRequest (event: FetchEvent): Promise<Response> {
  if (event.request.method !== 'POST') {
    return new ResponseError()
      .addError({
        title: 'Bad Method',
        detail: 'This endpoint only accepts POST requests'
      })
      .toResponse()
  }

  let request: RequestType = {
    rdnn: '',
    key: '',
    token: '',
    email: '',
    amount: 0,
    currency: 'USD'
  }

  try {
    request = await parseRequest(event.request)
  } catch (err) {
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

  console.log('request', request)

  return new Response(JSON.stringify({ hello: 'worker' }), { status: 200 })

  /**
  const payment = await stripe.charges.create({
    amount: request.amount,
    application_fee_amount: 100,
    capture: true,
    currency: request.currency,
    description: request.rdnn,
    on_behalf_of: request.key,
    source: request.token
  })
  */
}

addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(handleRequest(event))
})
