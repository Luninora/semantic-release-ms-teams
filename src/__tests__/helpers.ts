import type { Context, Logger } from "../types.js";

export function createLogger(): Logger {
  const noop = (..._args: unknown[]) => {};
  return {
    await: noop,
    complete: noop,
    debug: noop,
    error: noop,
    fatal: noop,
    fav: noop,
    info: noop,
    log: noop,
    note: noop,
    pause: noop,
    pending: noop,
    star: noop,
    start: noop,
    success: noop,
    wait: noop,
    warn: noop,
    watch: noop,
  };
}

export function createContext(overrides: Partial<Context> = {}): Context {
  return {
    logger: createLogger(),
    env: {},
    options: {
      repositoryUrl: "https://github.com/Luninora/admin",
    },
    commits: [
      {
        hash: "abc123",
        message: "feat: add something",
        subject: "feat: add something",
        body: "",
        author: { name: "Test User", email: "test@example.com" },
        committer: { name: "Test User", email: "test@example.com" },
        committerDate: "2026-01-01",
      },
    ],
    lastRelease: {
      version: "1.0.0",
      gitTag: "v1.0.0",
      gitHead: "def456",
      channels: [null],
    },
    nextRelease: {
      version: "1.1.0",
      gitTag: "v1.1.0",
      gitHead: "abc123",
      channels: [null],
      type: "minor",
      notes: `## [1.1.0](https://github.com/Luninora/admin/compare/v1.0.0...v1.1.0) (2026-01-01)

### Features

* add new feature ([abc123](https://github.com/Luninora/admin/commit/abc123))
* another feature ([def456](https://github.com/Luninora/admin/commit/def456))

### Bug Fixes

* fix a bug ([ghi789](https://github.com/Luninora/admin/commit/ghi789))
`,
    },
    ...overrides,
  };
}
