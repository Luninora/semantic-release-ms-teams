/**
 * Local type definitions for semantic-release context.
 *
 * The @types/semantic-release package uses `export default function` alongside
 * named exports, which is incompatible with TypeScript's Node16 module
 * resolution. We define the types we need locally instead.
 */

export type LoggerFunction = (...message: unknown[]) => void;

export interface Logger {
  await: LoggerFunction;
  complete: LoggerFunction;
  debug: LoggerFunction;
  error: LoggerFunction;
  fatal: LoggerFunction;
  fav: LoggerFunction;
  info: LoggerFunction;
  log: LoggerFunction;
  note: LoggerFunction;
  pause: LoggerFunction;
  pending: LoggerFunction;
  star: LoggerFunction;
  start: LoggerFunction;
  success: LoggerFunction;
  wait: LoggerFunction;
  warn: LoggerFunction;
  watch: LoggerFunction;
}

export type PluginSpec = string | [string, unknown];

export interface GlobalConfig {
  dryRun?: boolean;
  repositoryUrl?: string;
  plugins?: PluginSpec[];
  [key: string]: unknown;
}

export interface LastRelease {
  version: string;
  gitTag: string;
  gitHead: string;
  channels: Array<string | null>;
}

export interface NextRelease extends LastRelease {
  type: string;
  notes: string;
}

export interface Commit {
  hash: string;
  message: string;
  author: {
    name: string;
    email: string;
  };
  committer: {
    name: string;
    email: string;
  };
  committerDate: string;
  subject: string;
  body: string;
}

export interface Context {
  options?: GlobalConfig;
  lastRelease?: LastRelease;
  nextRelease?: NextRelease;
  logger: Logger;
  env: Record<string, string>;
  commits?: Commit[];
}
