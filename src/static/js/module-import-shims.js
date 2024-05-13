export const loadDependency = {
  async fromWindow(modulePath) {
    globalThis.window = {};

    await import(modulePath);

    const exports = globalThis.window;

    delete globalThis.window;

    return exports;
  },

  async fromModuleExports(modulePath) {
    globalThis.exports = {};
    globalThis.module = {exports: globalThis.exports};

    await import(modulePath);

    const exports = globalThis.exports;

    delete globalThis.module;
    delete globalThis.exports;

    return exports;
  },
};
