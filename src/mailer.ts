import FormData from 'form-data'

import { RequestType } from './request'

export async function sendReceipt (request: RequestType): Promise<Boolean> {
  const form = new FormData()
  form.append('from', 'elementary AppCenter <payment@elementary.io>')
  form.append('to', request.email)
  form.append('subject', 'AppCenter Purchase')
  form.append('template', 'appcenter-payment')
  form.append('v:amount', Math.round(request.amount / 100))
  form.append('v:rdnn', request.rdnn)

  const res = await fetch(
    'https://api.mailgun.net/v3/mg.elementary.io/messages',
    {
      method: 'POST',
      headers: {
        Authorization:
          'Basic ' + btoa(`${MAILGUN_USERNAME}:${MAILGUN_API_KEY}`)
      },
      // I hate TypeScript and npm _most_ days.
      body: (form as unknown) as string
    }
  )

  if (res.status !== 200) {
    const body = await res.text()
    console.error(`Error sending email: ${body}`)
    return false
  } else {
    return true
  }
}
