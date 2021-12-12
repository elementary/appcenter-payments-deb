import formData from 'form-data'
import Mailgun from 'mailgun.js'

import { RequestType } from './request'

declare const MAILGUN_USERNAME: string
declare const MAILGUN_API_KEY: string

const mailgun = new Mailgun(formData)
const mg = mailgun.client({
  username: MAILGUN_USERNAME,
  key: MAILGUN_API_KEY
})

export async function sendReceipt (request: RequestType): Promise<Object> {
  const data = {
    from: 'elementary AppCenter <payment@elementary.io>',
    to: request.email,
    // FIXME: Add the AppCenter app name instead of rdnn
    subject: 'AppCenter Purchase',
    template: 'appcenter-payment',
    'h:X-Mailgun-Variables': JSON.stringify({
      amount: Math.round(request.amount / 100),
      rdnn: request.rdnn
    })
  }

  return await mg.messages.create('mg.elementary.io', data)
}
