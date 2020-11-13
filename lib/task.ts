// deno-lint-ignore-file no-explicit-any
import { EventEmitter, nanoid, validate } from "./deps.ts";
import { ID, Options, Timestamps } from "./types.ts";

export class Task extends EventEmitter {
  id: ID;
  name: string;
  data: any;
  options: Options;
  nextRunAt?: Date;
  running: boolean;
  timestamps: Timestamps;
  stacktrace: Array<string> = [];

  constructor(name: string, data?: any, options?: Options) {
    super();
    this.id = nanoid(15);
    this.name = name;
    this.data = data || {};
    this.running = false;
    this.options = {
      repeat: false,
      retries: 0,
      ...options,
    };
    this.timestamps = { createdAt: new Date() };
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
}
