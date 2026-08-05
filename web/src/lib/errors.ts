import { ApiError } from './api'

/**
 * Turns anything thrown by the API client into a sentence worth showing.
 * Services return a `message` field, which is usually already human-readable
 * (e.g. "Ride ... cannot be started from status REQUESTED").
 */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }

  // fetch() rejects with a TypeError when the server can't be reached at all.
  if (error instanceof TypeError) {
    return 'Could not reach the server. Check that the API Gateway is running on port 8080.'
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Something went wrong.'
}
