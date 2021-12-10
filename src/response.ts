import * as JSONAPI from 'jsonapi-typescript'
import Stripe from 'stripe'
import { ZodError } from 'zod'

export class ResponseError {
  protected errors: JSONAPI.ErrorObject[]
  protected status: number

  constructor () {
    this.errors = []
    this.status = 400
  }

  addError (error: JSONAPI.ErrorObject): this {
    this.errors.push(error)

    return this
  }

  addStripeError (error: Stripe.StripeError): this {
    this.errors.push({
      code: error.type,
      title: error.name,
      detail: error.message
    })

    return this
  }

  addValidationError (error: ZodError): this {
    error.errors.forEach(nestedError => {
      const source =
        nestedError.path === ['project']
          ? { parameter: 'project' }
          : { pointer: `data/attributes/${nestedError.path.join('/')}` }

      const parsedError = {
        code: nestedError.code,
        title: 'Validation Error',
        detail: nestedError.message,
        source
      }

      this.addError(parsedError)
    })

    return this
  }

  setStatus (status: number): this {
    this.status = status

    return this
  }

  toObject (): JSONAPI.Document {
    return { errors: this.errors }
  }

  toString (): string {
    return JSON.stringify(this.toObject())
  }

  toResponse (): Response {
    return new Response(this.toString(), { status: this.status })
  }
}
