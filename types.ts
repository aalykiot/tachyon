export type ID = string;

export interface Stats {
  running: number;
}

export interface Config {
  maxConcurrency: number;
}

export interface Options {
  interval?: string | number;
  repeat?: boolean;
  timeout?: number;
  retries?: number;
  immediate?: boolean;
}

export interface SubOptions {
  timeout?: number;
  retries?: number;
}

export interface Timestamps {
  createdAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
}

export interface ExContext<T> {
  id?: number;
  promise: Promise<T>;
}
