// deno-lint-ignore-file no-explicit-any
import { nanoid, R, validate } from "../deps.ts";
import { Takion } from "./runtime.ts";
import { ID, Options, TaskStats } from "./index.d.ts";
import { nextDate } from "./utils/helpers.ts";

const defaultOptions: Options = {
  interval: 0,
  repeat: false,
  immediate: true,
  timeout: -1,
  retries: 0,
};

const initStats = {
  running: false,
  stacktrace: [],
};

export class Task {
  runtime: Takion;
  id: ID;
  name: string;
  nextRunAt: Date | null;
  data: any;
  options: Options;
  stats: TaskStats;

  constructor(
    runtime: Takion,
    name: string,
    data: any = {},
    options: any = {},
  ) {
    this.runtime = runtime;
    this.id = nanoid(15);
    this.name = name;
    this.nextRunAt = null;
    this.options = R.mergeDeepRight(defaultOptions, options);
    this.data = data;
    this.stats = initStats;
  }

  timeout(timeout: number): Task {
    this.options.timeout = timeout < 0 ? 0 : timeout;
    return this;
  }

  retries(retries: number): Task {
    this.options.retries = retries < 0 ? 0 : retries;
    return this;
  }

  repeat(repeat?: boolean): Task {
    this.options.repeat = repeat ?? true;
    return this;
  }

  interval(interval: number | string): Task {
    if (typeof interval === "string") {
      const cronExpressionValid = validate(interval, {
        strict: false,
      });

      if (!cronExpressionValid) {
        throw new Error(`Cron expression provided "${interval}" is not valid`);
      }

      this.options.interval = interval;
      return this;
    }

    this.options.interval = interval < 0 ? 1 : interval;
    return this;
  }

  skipImmediate() {
    this.options.immediate = false;
    return this;
  }

  save(): Promise<Task> {
    // this `if` is not that great but for now it'll work
    if (!this.options.interval && this.options.interval !== 0) {
      return Promise.reject(
        "You can't save a task with the interval undefined",
      );
    }

    this.nextRunAt = this.options.immediate
      ? new Date()
      : nextDate(this.options.interval);

    this.runtime.tasks.set(this.id, this);
    this.runtime.enqueue(this);

    return Promise.resolve(this);
  }

  delta(): number {
    // interval value is not declared yet
    if (!this.nextRunAt) return -1;
    // compute the milliseconds between now and the execution date
    const now = new Date();
    return this.nextRunAt.getTime() - now.getTime();
  }
}