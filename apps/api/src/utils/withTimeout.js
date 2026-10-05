// Rejects if `promise` does not settle within `ms` milliseconds.
export function withTimeout(promise, ms, message = `Timed out after ${ms} ms`) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
