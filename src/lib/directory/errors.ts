import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

/** Expected, user-facing failure. Anything else is treated as an internal error and never leaked. */
export class DirectoryError extends Error {
  constructor(public status: number, message: string, public code = 'DIRECTORY_ERROR') {
    super(message)
  }
}

export function handleRouteError(err: unknown) {
  if (err instanceof DirectoryError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status })
  if (err instanceof ZodError) return NextResponse.json({ error: 'Validation failed', details: err.flatten() }, { status: 400 })
  console.error('[directory] unexpected error', err)
  return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
}
