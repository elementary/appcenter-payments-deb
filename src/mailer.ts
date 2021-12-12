import FormData from 'form-data'

import { RequestType } from './request'

declare const MAILGUN_USERNAME: string
declare const MAILGUN_API_KEY: string

export async function sendReceipt (request: RequestType): Promise<Object> {
  const form = new FormData()
  form.append('from', 'elementary AppCenter <payment@elementary.io>')
  form.append('to', request.email)
  form.append('subject', 'AppCenter Purchase')
  form.append('template', 'appcenter-payment')
  form.append('v:amount', Math.round(request.amount / 100))
  form.append('v:rdnn', request.rdnn)

  return await fetch(`https://api.mailgun.net/v3/mg.elementary.io/messages`, {
    method: 'POST',
    credentials: undefined,
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64'),
      'Content-Type': 'multipart/form-data'
    },
    // I hate TypeScript and npm _most_ days.
    body: ((form as unknown) as string)
  })
}
