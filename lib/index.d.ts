export type ID = string;

export interface Stats {
  concurrent: number;
}

export interface Config {
  maxConcurrency: number;
}

export interface Options {
  interval: string | number;
  repeat: boolean;
  immediate: boolean;
  timeout: number;
  retries: number;
}

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

export interface ExContext<T> {
  id?: number;
  promise: Promise<T>;
}
