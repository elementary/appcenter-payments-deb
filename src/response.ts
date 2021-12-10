import * as JSONAPI from 'jsonapi-typescript'
import { ZodError } from 'zod'

export class ResponseError {
  protected errors: JSONAPI.ErrorObject[]

  constructor () {
    this.errors = []
  }

  addError (error: JSONAPI.ErrorObject): this {
    this.errors.push(error)

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

  toObject (): JSONAPI.DocWithErrors {
    return { errors: this.errors }
  }

  toString (): string {
    return JSON.stringify(this.toObject())
  }

  toResponse (): Response {
    return new Response(this.toString(), { status: 400 })
  }
}
