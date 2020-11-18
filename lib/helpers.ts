// deno-lint-ignore-file ban-types no-explicit-any
import { CronosExpression } from "../deps.ts";
import { ExContext } from "../types.ts";

export const nextDate = (interval: string | number): Date => {
  // if cron expression use cronosjs
  if (typeof interval === "string") {
    return CronosExpression.parse(interval).nextDate();
  }
  // otherwise it's an interval
  return new Date(new Date().getTime() + interval);
};

export const promiseWithTimeout = (
  fn: Function,
  ms: number,
): ExContext<any> => {
  let id;
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

const retry = (fn: Function, retries: number, timeout?: number): Promise<any> =>
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
  data: any,
  retries: number,
  timeout?: number,
): Promise<any> => {
  const wrapper = async () => fn(data);
  return retry(wrapper, retries, timeout);
};
