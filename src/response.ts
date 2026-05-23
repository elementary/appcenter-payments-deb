import Stripe from 'stripe'
import { ZodError } from 'zod'

interface JsonApiErrorObject {
  id?: number | string
  status?: string
  code?: string
  title?: string
  detail?: string
  source?: {
    pointer?: string
    parameter?: string
  }
}

interface JsonApiErrorDocument {
  errors: JsonApiErrorObject[]
}

export class ResponseError {
  protected errors: JsonApiErrorObject[]
  protected status: number

  constructor () {
    this.errors = []
    this.status = 400
  }

  addError (error: JsonApiErrorObject): this {
    this.errors.push(error)

    return this
  }

  addStripeError (error: InstanceType<typeof Stripe.errors.StripeError>): this {
    this.errors.push({
      code: error.type,
      title: error.name,
      detail: error.message
    })

    return this
  }

  addValidationError (error: ZodError): this {
    error.issues.forEach(nestedError => {
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

  toObject (): JsonApiErrorDocument {
    return { errors: this.errors }
  }

  toString (): string {
    return JSON.stringify(this.toObject())
  }

  toResponse (): Response {
    return new Response(this.toString(), { status: this.status })
  }
}
