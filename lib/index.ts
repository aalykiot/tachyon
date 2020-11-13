// deno-lint-ignore-file ban-types no-explicit-any
import { EventEmitter } from "../deps.ts";
import { ID, Options, SubOptions } from "../types.ts";
import { Task } from "./task.ts";

export class Taskio extends EventEmitter {
  // Defining data structures
  queue: Array<ID> = [];
  definitions: Map<ID, Function> = new Map();
  tasks: Map<ID, Task> = new Map();

  // Defining timers
  interval?: number = undefined;

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
      const { nextRunAt } = this.tasks.get(id) as Task;
      return task.nextRunAt!.getTime() < nextRunAt!.getTime();
    });
    // Inserting task to queue
    this.queue.splice(idx !== -1 ? idx : this.queue.length, 0, task.id);
  }

  create(name: string, data?: any, options?: Options): Task {
    if (!this.definitions.has(name)) {
      throw Error(`Task "${name}" is not yet defined`);
    }
    return new Task(this, name, data, options);
  }

  now(name: string, data?: any, options?: SubOptions): Promise<Task> {
    const task = this.create(name, data, options);
    return task.interval(1).repeat(false).save();
  }

  every(
    interval: number,
    name: string,
    data?: any,
    options?: SubOptions,
  ): Promise<Task> {
    const task = this.create(name, data, options);
    return task.interval(interval).repeat().save();
  }

  schedule(
    cron: string,
    name: string,
    data?: any,
    repeat?: boolean,
    options?: SubOptions,
  ): Promise<Task> {
    const task = this.create(name, data, options);
    return task.interval(cron).repeat(repeat).skipImmediate().save();
  }
}
