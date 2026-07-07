/* eslint-disable no-console */
/** electron-log test stub — replaces all electron-log sub-paths in Vitest via alias */
const noop = () => {};

const stub = {
  // Use arrow functions so vi.spyOn replacements are picked up at call time
  debug: (...a: unknown[]) => console.debug(...a),
  info: (...a: unknown[]) => console.info(...a),
  warn: (...a: unknown[]) => console.warn(...a),
  error: (...a: unknown[]) => console.error(...a),
  initialize: noop,
  transports: {
    file: { level: false as const },
    console: { level: "warn" as const },
  },
};

export default stub;
