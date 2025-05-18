type Success<T> = { data: T; error: null };
type Failure<E> = { data: null; error: E };

export type Result<T, E = Error> = Success<T> | Failure<E>;

export async function tryCatch<T, E = Error>(
  promise: Promise<T>
): Promise<Result<T, E>> {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as E };
  }
}

export async function retry<T, E = Error>(
  fn: () => Promise<T>,
  action: string,
  retries = 3,
  delay = 10000,
  panicAt = 5
): Promise<Result<T, E>> {
  let attempt = 0;
  while (attempt++ < retries) {
    try {
      const data = await fn();
      if (attempt > 5) console.log(`Success ${action} (attempt ${attempt})`);
      return { data, error: null };
    } catch (error) {
      if (attempt === panicAt)
        panic(`Panic: Failed ${action} ${attempt} times: ${error}`);
      if (retries === attempt) return { data: null, error: error as E };
      await new Promise((_) => setTimeout(_, delay));
    }
  }
  return { data: null, error: new Error("Unexpected error") as E };
}
function panic(message?: string) {
  console.error(`${message}`);
}
