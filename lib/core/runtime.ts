// deno-lint-ignore-file ban-types
import { EventEmitter } from "../../deps.ts";
import { Config, Data, ExecOptions, ID, Options, Stats } from "../../types.ts";
import { PROCESS_INTERVAL, PROCESS_INTERVAL_LIMIT } from "../constants.ts";
import { nextDate } from "../helpers.ts";
import { defaultOptions, Task } from "./task.ts";
import { execute } from "./ops.ts";

const defaultConfig: Config = {
  maxConcurrency: 20,
};

export class Takion {
  // defining config
  config: Config;
  // defining data structures
  queue: Array<ID>;
  definitions: Map<ID, Function>;
  tasks: Map<ID, Task>;
  // defining timers
  processInterval?: number;
  // defining stats
  stats: Stats;
  // defining event-emitter
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
      concurrent: 0,
    };
  }

  define(name: string, fn: Function): void {
    // checking if task name already exists in definitions map
    if (this.definitions.has(name)) {
      throw Error("Name already exists on definition table");
    }
    this.definitions.set(name, fn);
  }

  enqueue(task: Task): void {
    // pushing task to queue if the queue is empty
    if (this.queue.length === 0) {
      this.queue.push(task.id);
      return;
    }
    // calculating the correct index based on the nextRunAt
    const idx = this.queue.findIndex((id) => {
      const { nextRunAt } = this.tasks.get(id) as Task;
      return task.nextRunAt!.getTime() < nextRunAt!.getTime();
    });
    // inserting task to queue
    this.queue.splice(idx !== -1 ? idx : this.queue.length, 0, task.id);
  }

  process(): void {
    // no tasks in the queue to process
    if (this.queue.length === 0) {
      this.updateInterval(PROCESS_INTERVAL);
      return;
    }

    // max concurrency reached, no more tasks can be processed at this time
    if (this.stats.concurrent >= this.config.maxConcurrency) {
      this.updateInterval(PROCESS_INTERVAL);
      return;
    }

    const id = this.queue[0];
    const task = this.tasks.get(id) as Task;

    const delta = task.delta();

    // we need to idle until the next task
    if (delta > 0) {
      this.updateInterval(delta);
      return;
    }

    // pop task from the queue
    this.queue = this.queue.slice(1, this.queue.length);

    // get function from the definitions
    const taskFunction = this.definitions.get(task.name) as Function;

    // pre-flight checks
    task.stats.running = true;
    task.stats.startedAt = new Date();

    this.stats.concurrent += 1;
    this.events.emit("start", task);
    this.events.emit(`start:${task.name}`, task);

    (async () => {
      try {
        const result = await execute(
          taskFunction,
          task.data,
          task.options.retries!,
          task.options.timeout!,
        );
        // emit `success` events
        this.events.emit("success", task, result);
        this.events.emit(`success:${task.name}`, task, result);
      } catch (err) {
        // write error stacktrace to task
        task.stats.stacktrace.push({
          timestamp: new Date(),
          error: err?.message || err,
        });
        // emit `failure` events
        this.events.emit("fail", task, err);
        this.events.emit(`fail:${task.name}`, task, err);
      } finally {
        // post-flight checks
        task.stats.running = false;
        task.stats.finishedAt = new Date();
        // emit `completed` events
        this.events.emit("complete", task);
        this.events.emit(`complete:${task.name}`, task);

        this.stats.concurrent -= 1;
      }
    })();

    // if the task is repeatable add it to queue again
    if (task.options.repeat) {
      task.nextRunAt = nextDate(task.options.interval!);
      this.enqueue(task);
    }

    // check for next task in queue immediately
    this.updateInterval(0);
  }

  updateInterval(interval: number): void {
    // if the interval exceeds the max allowed value, idle for max interval
    const newInterval = interval > PROCESS_INTERVAL_LIMIT
      ? PROCESS_INTERVAL_LIMIT
      : interval;
    // update process interval
    clearInterval(this.processInterval);
    this.processInterval = setInterval(this.process.bind(this), newInterval);
  }

  start(): void {
    if (this.processInterval) return; // runtime already started
    this.processInterval = setInterval(
      this.process.bind(this),
      PROCESS_INTERVAL,
    );
  }

  stop(): void {
    clearInterval(this.processInterval);
    this.processInterval = undefined;
  }

  // create a `raw` task
  create(name: string, data?: Data, options?: Options): Task {
    if (!this.definitions.has(name)) {
      throw Error(`Task "${name}" is not yet defined`);
    }
    return new Task(this, name, data, options);
  }

  // create a task that runs as soon as possible
  now(name: string, data?: Data, options?: ExecOptions): Promise<Task> {
    return this.create(name, data, { ...defaultOptions, ...options })
      .interval(0)
      .repeat(false)
      .save();
  }

  // create a repeated task
  every(
    interval: number,
    name: string,
    data?: Data,
    options?: ExecOptions,
  ): Promise<Task> {
    return this.create(name, data, { ...defaultOptions, ...options })
      .interval(interval)
      .repeat()
      .save();
  }

  // create a task that runs based on a cron schedule
  schedule(
    cron: string,
    name: string,
    data?: Data,
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
