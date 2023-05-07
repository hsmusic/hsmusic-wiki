export class NormalizedWeakMap extends WeakMap {
  #cache = new WeakMap();

  normalize(key) {
    throw new Error(`normalize not implemented`);
  }

  #cachedNormalize(key) {
    if (typeof key !== 'object') {
      throw new TypeError(`Expected key to be an object`);
    }

    if (this.#cache.has(key)) {
      return this.#cache.get(key);
    } else {
      const normalized = this.normalize(key);
      this.#cache.set(key, normalized);
      return normalized;
    }
  }

  get(key) {
    return super.get(this.#cachedNormalize(key));
  }

  set(key, value) {
    return super.set(this.#cachedNormalize(key), value);
  }

  has(key) {
    return super.has(this.#cachedNormalize(key));
  }

  delete(key) {
    return super.delete(this.#cachedNormalize(key));
  }
}

export class NormalizedArrayMap extends NormalizedWeakMap {
  #topCache = this.#createCache([]);

  normalize(array) {
    let index = 0;
    let cache = this.#topCache;
    let infantCache = false;

    while (index < array.length) {
      const item = array[index];
      const whichCache = (typeof item === 'object' ? 1 : 2);

      let nextCache = undefined;

      if (!infantCache) {
        // Note: This could still be undefined - infantCache just skips the get
        // op here because it would *definitely* be undefined.
        nextCache = cache[whichCache].get(item);
      }

      if (nextCache === undefined) {
        nextCache = this.#createCache();
        cache[whichCache].set(item, nextCache);
        infantCache = true;
      }

      cache = nextCache;
      index++;
    }

    return cache[0];
  }

  #createCache() {
    return [{}, new WeakMap(), new Map()];
  }
}

export class BlackBox {
  profiling = true; /* Unused for now */
  caching = true;

  #cache = new NormalizedArrayMap();
  #computeFunction = null;

  constructor(computeFunction) {
    this.#computeFunction = computeFunction;
  }

  getEvaluator() {
    return (...args) => {
      if (this.caching) {
        return this.evaluateCached(...args);
      } else {
        return this.#computeFunction(...args);
      }
    };
  }

  evaluateCached(...args) {
    if (this.#cache.has(args)) {
      return this.#cache.get(args);
    } else {
      const result = this.#computeFunction(...args);
      this.#cache.set(args, result);
      return result;
    }
  }
}

export class ContractManager {
  #registeredContracts = Object.create(null);

  registerContract(name, description) {
    ContractManager.validateContractDescription(description);
    this.#registeredContracts[name] = description;
  }

  getContractHooks(name) {
    return this.getContractInfo(name).hooks;
  }

  getContractInfo(name) {
    // todo: cache
    return this.#computeContractInfo(name);
  }

  #computeContractInfo(name) {
    const description = this.#registeredContracts[name];
    if (!description) {
      throw new Error(`Contract ${name} not registered`);
    }

    let numArguments = 0;
    const args = [];
    const argumentGenerator = (function*() {
      while (true) {
        const argument = {type: 'argument', index: numArguments++, of: name}
        args.push(argument);
        yield argument;
      }
    })();

    const hooks = [];
    const subcontracts = {};
    const structure = {};

    const contractUtility = {
      subcontract: (name, ...args) => {
        const hook = {type: 'subcontract', name, args};
        const shape = {type: 'subcontract', name, args};

        hooks.push(hook);
        return shape;
      },

      provide: (properties) => {
        Object.assign(structure, properties);
      },

      selectProperty: (object, propertyString) => {
        const propertyPath = propertyString.split('.');

        const hook = {type: 'selectPropertyPath', object, path: propertyPath};
        const shape = {type: 'selectPropertyPath', object, path: propertyPath};

        hooks.push(hook);
        return shape;
      },
    };

    description.hook(contractUtility, argumentGenerator);

    return {hooks, subcontracts, structure};
  }

  static validateContractDescription(description) {
    // todo
  }
}

/*
const {default: {contracts}} = await import('./content/dependencies/generateAlbumTrackList.js');
const util = await import('util');

const manager = new ContractManager();
for (const [name, description] of Object.entries(contracts)) {
  manager.registerContract(name, description);
}

const testContract = 'displayTrackSections';

for (const hook of manager.getContractHooks(testContract)) {
  if (hook.type === 'selectPropertyPath') {
    console.log(`- (${util.inspect(hook.object, {colors: true})}).${hook.path.join('.')}`);
  } else {
    console.log(`- ${hook}`);
  }
}

// console.log(util.inspect(manager.getContractInfo(testContract).structure, {colors: true, depth: Infinity}));
*/

// lousy perf test
if ((await import('./util/node-utils.js')).isMain(import.meta.url)) {
  const obj1 = {foo: 3, bar: 4};
  const obj2 = {baz: 5, qux: 6};

  let fn = (object, key) => object[key] ** 2;
  let bb = new BlackBox(fn);
  let evaluate = bb.getEvaluator();

  const gogogo = (once) => {
    let iters = 0;
    for (let end = Date.now() + 1000; Date.now() < end;) {
      once(obj1, 'foo');
      once(obj1, 'foo');
      once(obj2, 'qux');
      once(obj2, 'qux');
      once(obj1, 'foo');
      once(obj1, 'bar');
      once(obj2, 'baz');
      once(obj1, 'foo');
      iters += 8;
    }
    return iters;
  };

  console.log(`Iterations - black box w/ cache:  ${gogogo(evaluate)}`);
  console.log(`Iterations - black box w/ cache:  ${gogogo(evaluate)}`);
  console.log(`Iterations - black box w/ cache:  ${gogogo(evaluate)}`);

  bb.caching = false;
  console.log(`Iterations - black box w/o cache: ${gogogo(evaluate)}`);
  console.log(`Iterations - black box w/o cache: ${gogogo(evaluate)}`);
  console.log(`Iterations - black box w/o cache: ${gogogo(evaluate)}`);
  console.log(`Iterations - black box w/o cache: ${gogogo(evaluate)}`);

  console.log(`Iterations - direct pass to fn:   ${gogogo(fn)}`);
  console.log(`Iterations - direct pass to fn:   ${gogogo(fn)}`);
  console.log(`Iterations - direct pass to fn:   ${gogogo(fn)}`);
  console.log(`Iterations - direct pass to fn:   ${gogogo(fn)}`);

  bb.caching = false;
  console.log(`Iterations - black box w/o cache: ${gogogo(evaluate)}`);
  console.log(`Iterations - black box w/o cache: ${gogogo(evaluate)}`);
  console.log(`Iterations - black box w/o cache: ${gogogo(evaluate)}`);
  console.log(`Iterations - black box w/o cache: ${gogogo(evaluate)}`);
  console.log(`Iterations - black box w/o cache: ${gogogo(evaluate)}`);
  console.log(`Iterations - black box w/o cache: ${gogogo(evaluate)}`);
  console.log(`Iterations - black box w/o cache: ${gogogo(evaluate)}`);
  console.log(`Iterations - black box w/o cache: ${gogogo(evaluate)}`);

  console.log(`Iterations - direct pass to fn:   ${gogogo(fn)}`);
  console.log(`Iterations - direct pass to fn:   ${gogogo(fn)}`);
  console.log(`Iterations - direct pass to fn:   ${gogogo(fn)}`);
  console.log(`Iterations - direct pass to fn:   ${gogogo(fn)}`);
}
