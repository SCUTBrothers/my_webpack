/**
 * if err is null, then result must be defined
 */
export type Callback<T> = (err: Error | null, result: T | null) => void
