export type ID = string;

export interface Stats {
  concurrent: number;
}

export interface Config {
  maxConcurrency: number;
}

export interface SetupOptions {
  interval?: string | number;
  repeat?: boolean;
  immediate?: boolean;
}

export interface ExecOptions {
  timeout?: number;
  retries?: number;
}

export type Options = SetupOptions & ExecOptions;

export interface Stacktrace {
  timestamp: Date;
  error: string;
}

export interface TaskStats {
  running: boolean;
  createdAt?: Date;
  startedAt?: Date;
  finishedAt?: Date;
  stacktrace: Array<Stacktrace>;
}

export interface TaskData {
  data: Record<string, unknown>;
}

export type Data = Record<string, unknown>;

export interface ExContext<T> {
  id?: number;
  promise: Promise<T>;
}
