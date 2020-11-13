// deno-lint-ignore-file ban-types
import { EventEmitter } from "./deps.ts";
import { ID } from "./types.ts";
import { Task } from "./task.ts";

export class Taskio extends EventEmitter {
  // Defining data structures
  queue: Array<ID> = [];
  definitions: Map<ID, Function> = new Map();
  tasks: Map<ID, Task> = new Map();

  // Defining timers
  interval?: number = undefined;

  define(name: string, fn: Function): void {
    // Checking if task name already exists in definitions array
    if (this.definitions.has(name)) {
      throw Error("Name already exists on definition table");
    }
    this.definitions.set(name, fn);
  }
}
