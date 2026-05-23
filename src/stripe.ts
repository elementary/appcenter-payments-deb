import Stripe from 'stripe'

import { RequestType } from './request'

interface FEES {
  stripe: number
  elementary: number
  developer: number
  total: number
}

function createClient (env: Env): Stripe {
  return new Stripe(env.STRIPE_SECRET_KEY!, {
    apiVersion: env.STRIPE_API_VERSION,
    appInfo: {
      name: 'appcenter-payments-deb',
      version: '1.0.0',
      url: 'https://github.com/elementary/appcenter-payments-deb'
    },
    httpClient: Stripe.createFetchHttpClient(),
    maxNetworkRetries: 5
  })
}

export function calculateFee (amount: number): FEES {
  const out = {
    stripe: 0,
    elementary: 0,
    developer: 0,
    total: amount
  }

  out.stripe = Math.ceil(amount * 0.029 + 30)

  out.elementary = Math.ceil(amount * 0.3)
  if (out.elementary < 50) {
    out.elementary = 50
  }

  out.developer = amount - out.elementary - out.stripe

  return out
}

export async function createCharge (
  request: RequestType,
  env: Env
): Promise<string> {
  const fees = calculateFee(request.amount)
  const stripe = createClient(env)

  // Legacy Charges API; Stripe recommends PaymentIntents for new card payments.
  const payment = await stripe.charges.create(
    {
      amount: fees.total,
      application_fee_amount: fees.elementary,
      capture: true,
      currency: request.currency.toLowerCase(),
      description: request.rdnn,
      source: request.token
    },
    {
      stripeAccount: request.account
    }
  )

  return payment.id
}
