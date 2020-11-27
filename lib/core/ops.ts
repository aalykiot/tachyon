// deno-lint-ignore-file ban-types no-explicit-any
import { ExContext, Data } from "../../types.ts";

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

export const execute = async (
  fn: Function,
  data: Data,
  retries: number,
  timeout: number | null,
): Promise<any> => {
  const wrapper = async () => fn(data);
  return retry(wrapper, retries, timeout);
};
