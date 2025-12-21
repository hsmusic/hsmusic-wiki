// Very simple, bare-bones file size loader which takes a bunch of file
// paths, gets their filesizes, and resolves a promise when it's done.
//
// Once the size of a path has been loaded, it's available synchronously -
// so this may be provided to code areas which don't support async code!
//
// This class also supports loading more paths after the initial batch is
// done (it uses a queue system) - but make sure you pause any sync code
// depending on the results until it's finished. waitUntilDoneLoading will
// always hold until the queue is completely emptied, including waiting for
// any entries to finish which were added after the wait function itself was
// called. (Same if you decide to await loadPaths. Sorry that function won't
// resolve as soon as just the paths it provided are finished - that's not
// really a worthwhile feature to support for its complexity here, since
// basically all this should process almost instantaneously anyway!)
//
// This only processes files one at a time because I'm lazy and stat calls
// are very, very fast.

import {relative, resolve, sep} from 'node:path';

import {logWarn} from '#cli';
import {stat} from '#quickstat';
import {filterMultipleArrays, transposeArrays} from '#sugar';

export default class FileSizePreloader {
  #paths = [];
  #sizes = [];
  #loadedPathIndex = -1;

  #loadingPromise = null;
  #resolveLoadingPromise = null;

  hadErrored = false;

  constructor({prefix = ''} = {}) {
    this.prefix = prefix;
  }

  loadPaths(...paths) {
    this.#paths.push(...paths.filter((p) => !this.#paths.includes(p)));
    return this.#startLoadingPaths();
  }

  waitUntilDoneLoading() {
    return this.#loadingPromise ?? Promise.resolve();
  }

  #startLoadingPaths() {
    if (this.#loadingPromise) {
      return this.#loadingPromise;
    }

    ({promise: this.#loadingPromise,
      resolve: this.#resolveLoadingPromise} =
        Promise.withResolvers());

    this.#loadNextPath();

    return this.#loadingPromise;
  }

  async #loadNextPath() {
    if (this.#loadedPathIndex === this.#paths.length - 1) {
      return this.#doneLoadingPaths();
    }

    let size;

    const path = this.#paths[this.#loadedPathIndex + 1];

    try {
      size = await this.readFileSize(path);
    } catch (error) {
      // Oops! Discard that path, and don't increment the index before
      // moving on, since the next path will now be in its place.
      this.#paths.splice(this.#loadedPathIndex + 1, 1);
      this.hasErrored = true;
      logWarn`Failed to process file size for ${path}: ${error.message}`;
      return this.#loadNextPath();
    }

    this.#sizes.push(size);
    this.#loadedPathIndex++;
    return this.#loadNextPath();
  }

  #doneLoadingPaths() {
    this.#resolveLoadingPromise();
    this.#loadingPromise = null;
    this.#resolveLoadingPromise = null;
  }

  // Override me if you want?
  // The rest of the code here is literally just a queue system, so you could
  // pretty much repurpose it for anything... but there are probably cleaner
  // ways than making an instance or subclass of this and overriding this one
  // method!
  async readFileSize(path) {
    const stats = await stat(path);
    return stats.size;
  }

  getSizeOfPath(path) {
    let size = this.#getSizeOfPath(path);
    if (size || !this.prefix) return size;
    const path2 = resolve(this.prefix, path);
    if (path2 === path) return null;
    return this.#getSizeOfPath(path2);
  }

  #getSizeOfPath(path) {
    const index = this.#paths.indexOf(path);
    if (index === -1) return null;
    if (index > this.#loadedPathIndex) return null;
    return this.#sizes[index];
  }

  saveAsCache() {
    const entries =
      transposeArrays([
        this.#paths.slice(0, this.#loadedPathIndex)
          .map(path => relative(this.prefix, path)),

        this.#sizes.slice(0, this.#loadedPathIndex),
      ]);

    // Do not be alarmed: This cannot be meaningfully moved to
    // the top because stringifyCache sorts alphabetically lol
    entries.push(['_separator', sep]);

    return Object.fromEntries(entries);
  }

  loadFromCache(cache) {
    const {_separator: cacheSep, ...rest} = cache;
    const entries = Object.entries(rest);
    let [newPaths, newSizes] = transposeArrays(entries);

    if (sep !== cacheSep) {
      newPaths = newPaths.map(p => p.split(cacheSep).join(sep));
    }

    newPaths = newPaths.map(p => resolve(this.prefix, p));

    filterMultipleArrays(
      newPaths,
      newSizes,
      path => !this.#paths.includes(path));

    this.#paths.splice(this.#loadedPathIndex + 1, 0, ...newPaths);
    this.#sizes.splice(this.#loadedPathIndex + 1, 0, ...newSizes);
    this.#loadedPathIndex += entries.length;
  }
}
