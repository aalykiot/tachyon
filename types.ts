export type ID = string;

export interface Stats {
  running: number;
}

export interface Config {
  maxConcurrency: number;
}

export interface SetupOptions {
  interval: string | number | null;
  repeat: boolean;
  immediate: boolean;
}

export interface ExecOptions {
  timeout: number | null;
  retries: number;
}

export type Options = SetupOptions & ExecOptions;

export interface Timestamps {
  createdAt: Date;
  nextRunAt: Date | null;
  startedAt: Date | null;
  finishedAt: Date | null;
}

export interface ExContext<T> {
  id: number | null;
  promise: Promise<T>;
}

export interface Stacktrace {
  timestamp: Date;
  error: string;
}
