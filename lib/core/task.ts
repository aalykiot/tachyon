// deno-lint-ignore-file
import { nanoid, validate } from "../../deps.ts";
import { Data, ID, Options, TaskStats } from "../../types.ts";
import { nextDate } from "../helpers.ts";
import { Takion } from "./runtime.ts";

export const defaultOptions: Options = {
  interval: 0,
  repeat: false,
  retries: 0,
  immediate: true,
};

export class Task {
  runtime: Takion;
  id: ID;
  name: string;
  nextRunAt?: Date;
  data: Data;
  options: Options;
  stats: TaskStats;

  constructor(
    runtime: Takion,
    name: string,
    data: any = {},
    options: Options = defaultOptions,
  ) {
    this.runtime = runtime;
    this.id = nanoid(15);
    this.name = name;
    this.options = options;
    this.data = data,
      this.stats = {
        running: false,
        stacktrace: [],
      };
  }

  timeout(timeout: number): Task {
    if (timeout < 0) throw Error("Timeout must be a positive integer.");
    this.options.timeout = timeout;
    return this;
  }

  retries(retries: number): Task {
    if (retries < 0) throw Error("Retries must be a positive integer.");
    this.options.retries = retries;
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

    if (interval < 0) {
      throw new Error("Interval must be a positive number");
    }

    this.options.interval = interval;
    return this;
  }

  skipImmediate(): Task {
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
