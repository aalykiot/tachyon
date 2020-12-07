// deno-lint-ignore-file ban-types no-explicit-any
import { ExContext } from "./index.d.ts";

const promiseWithTimeout = (
  fn: Function,
  ms: number,
): ExContext<any> => {
  let id = undefined;
  const timeout = new Promise((resolve, reject) => {
    id = setTimeout(resolve, ms);
  });

  const promise = Promise.race([
    fn(),
    timeout.then(() => {
      throw Error(`Task did not finish within ${ms / 1000} seconds`);
    }),
  ]);

  return { id, promise };
};

const _promise = (fn: Function): ExContext<any> => ({
  id: undefined,
  promise: Promise.resolve(fn()),
});

const retry = (
  fn: Function,
  retries: number,
  timeout: number | null,
): Promise<any> =>
  new Promise((resolve, reject) => {
    const { id, promise } = !timeout
      ? _promise(fn)
      : promiseWithTimeout(fn, timeout);

    promise
      .then(resolve)
      .catch((err) => {
        if (retries === 0) {
          return reject(err?.message || err);
        }
        retry(fn, --retries, timeout)
          .then(resolve)
          .catch(reject);
      })
      .finally(() => clearTimeout(id));
  });

export const execute = (
  fn: Function,
  data: any,
  retries: number,
  timeout: number,
): Promise<any> => {
  const wrapper = async () => await fn(data);
  const tm = timeout < 0 ? null : timeout;
  return retry(wrapper, retries, tm);
};
