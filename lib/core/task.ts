// deno-lint-ignore-file no-explicit-any
import { nanoid, validate } from "../../deps.ts";
import { ID, Options, Timestamps } from "../../types.ts";
import { nextDate } from "../helpers.ts";
import { Taskio } from "./runtime.ts";

export const defaultOptions: Options = {
  interval: null,
  repeat: false,
  timeout: null,
  retries: 0,
  immediate: true,
};

export class Task {
  runtime: Taskio;
  id: ID;
  name: string;
  data: any;
  options: Options;
  running: boolean;
  timestamps: Timestamps;
  stacktrace: Array<string> = [];

  constructor(
    runtime: Taskio,
    name: string,
    data: any = {},
    options: Options = defaultOptions,
  ) {
    this.runtime = runtime;
    this.id = nanoid(15);
    this.name = name;
    this.data = data;
    this.running = false;
    this.options = options;
    this.timestamps = {
      createdAt: new Date(),
      nextRunAt: null,
      startedAt: null,
      finishedAt: null,
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
    this.options.repeat = repeat || false;
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
    if (!this.options.interval) {
      return Promise.reject(
        "You can't save a task with the interval undefined",
      );
    }

    this.timestamps.nextRunAt = this.options.immediate
      ? new Date()
      : nextDate(this.options.interval);

    this.runtime.tasks.set(this.id, this);
    this.runtime.enqueue(this);

    return Promise.resolve(this);
  }

  delta(): number {
    // Interval value is not declared yet
    if (!this.timestamps.nextRunAt) return -1;
    // Compute the milliseconds between now and the execution date
    const now = new Date();
    return this.timestamps.nextRunAt.getTime() - now.getTime();
  }
}
