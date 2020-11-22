// deno-lint-ignore-file ban-types no-explicit-any
import { EventEmitter } from "../../deps.ts";
import { Config, ExecOptions, ID, Options, Stats } from "../../types.ts";
import { PROCESS_INTERVAL, PROCESS_INTERVAL_LIMIT } from "../constants.ts";
import { nextDate } from "../helpers.ts";
import { defaultOptions, Task } from "./task.ts";
import { execute } from "./ops.ts";

const defaultConfig: Config = {
  maxConcurrency: 20,
};

export class Takion {
  // Defining config
  config: Config;
  // Defining data structures
  queue: Array<ID>;
  definitions: Map<ID, Function>;
  tasks: Map<ID, Task>;
  // Defining timers
  processInterval?: number;
  // Defining stats
  stats: Stats;
  // Defining event-emitter
  events: EventEmitter;

  constructor(config?: Config) {
    this.config = {
      ...defaultConfig,
      ...config,
    };
    this.queue = [];
    this.definitions = new Map();
    this.tasks = new Map();
    this.events = new EventEmitter();
    this.stats = {
      running: 0,
    };
  }

  define(name: string, fn: Function): void {
    // Checking if task name already exists in definitions map
    if (this.definitions.has(name)) {
      throw Error("Name already exists on definition table");
    }
    this.definitions.set(name, fn);
  }

  enqueue(task: Task): void {
    // Pushing task to queue if the queue is empty
    if (this.queue.length === 0) {
      this.queue.push(task.id);
      return;
    }
    // Calculating the correct index based on the nextRunAt
    const idx = this.queue.findIndex((id) => {
      const { timestamps: { nextRunAt } } = this.tasks.get(id) as Task;
      return task.timestamps.nextRunAt!.getTime() < nextRunAt!.getTime();
    });
    // Inserting task to queue
    this.queue.splice(idx !== -1 ? idx : this.queue.length, 0, task.id);
  }

  process(): void {
    // No tasks in the queue to process
    if (this.queue.length === 0) {
      this.updateInterval(PROCESS_INTERVAL);
      return;
    }

    // Max concurrency reached, no more tasks can be processed at this time
    if (this.stats.running >= this.config.maxConcurrency) {
      this.updateInterval(PROCESS_INTERVAL);
      return;
    }

    const id = this.queue[0];
    const task = this.tasks.get(id) as Task;

    const delta = task.delta();

    // We need to idle until the next task
    if (delta > 0) {
      this.updateInterval(delta);
      return;
    }

    // Pop task from the queue
    this.queue = this.queue.slice(1, this.queue.length);

    // Get function from the definitions
    const taskFunction = this.definitions.get(task.name) as Function;
    task.timestamps.startedAt = new Date();

    // Notify runtime that a new task is starting
    this.stats.running += 1;

    // Emit `starting` events for listeners
    this.events.emit("start", task);
    this.events.emit(`start:${task.name}`, task);

    // Execute task as an async function
    const ctx = execute(
      taskFunction,
      task.data,
      task.options.retries,
      task.options.timeout,
    );

    // Handle context's success, fail and default cases
    ctx.then((result) => {
      // Emit the `success` events for listeners
      this.events.emit("success", task, result);
      this.events.emit(`success:${task.name}`, task, result);
    }).catch((err) => {
      // Write error to task as a stacktrace
      task.stacktraces.push({
        timestamp: new Date(),
        error: err?.message || err,
      });
      // Emit the `failure` events for listeners
      this.events.emit("fail", task, err);
      this.events.emit(`fail:${task.name}`, task, err);
    }).finally(() => {
      // Emit the `completed` events for listeners
      this.events.emit("complete", task);
      this.events.emit(`complete:${task.name}`, task);
      // Notify runtime that the task is finished
      this.stats.running -= 1;
    });

    // If the task is repeatable add it to queue again
    if (task.options.repeat) {
      task.timestamps.nextRunAt = nextDate(task.options.interval!);
      this.enqueue(task);
    }

    // Check for next task in queue immediately
    this.updateInterval(0);
  }

  updateInterval(interval: number): void {
    // If the interval exceeds the max allowed value, idle for max interval
    const newInterval = interval > PROCESS_INTERVAL_LIMIT
      ? PROCESS_INTERVAL_LIMIT
      : interval;
    // Update process interval
    clearInterval(this.processInterval);
    this.processInterval = setInterval(this.process.bind(this), newInterval);
  }

  start(): void {
    if (this.processInterval) return; // Runtime already started
    this.processInterval = setInterval(
      this.process.bind(this),
      PROCESS_INTERVAL,
    );
  }

  stop(): void {
    clearInterval(this.processInterval);
    this.processInterval = undefined;
  }

  // Create a `raw` task for further manipulation
  create(name: string, data?: any, options?: Options): Task {
    if (!this.definitions.has(name)) {
      throw Error(`Task "${name}" is not yet defined`);
    }
    return new Task(this, name, data, options);
  }

  // Create a task that runs as soon as possible
  now(name: string, data?: any, options?: ExecOptions): Promise<Task> {
    return this.create(name, data, { ...defaultOptions, ...options })
      .interval(0)
      .repeat(false)
      .save();
  }

  // Create a repeated task
  every(
    interval: number,
    name: string,
    data?: any,
    options?: ExecOptions,
  ): Promise<Task> {
    return this.create(name, data, { ...defaultOptions, ...options })
      .interval(interval)
      .repeat()
      .save();
  }

  // Create a task that runs based on a cron schedule
  schedule(
    cron: string,
    name: string,
    data?: any,
    repeat?: boolean,
    options?: ExecOptions,
  ): Promise<Task> {
    return this.create(name, data, { ...defaultOptions, ...options })
      .interval(cron)
      .repeat(repeat)
      .skipImmediate()
      .save();
  }
}
