import { status } from "elysia"

/** Thrown from services; Elysia maps it to an HTTP response with the message as body. */
export const fail = {
  badRequest: (message: string) => status(400, message),
  notFound: (what: string) => status(404, `${what} not found`),
  conflict: (message: string) => status(409, message),
}

export function isUniqueViolation(error: unknown) {
  return error instanceof Error && error.message.includes("UNIQUE constraint failed")
}
