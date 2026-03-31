import {inspect as nodeInspect} from 'node:util';

import {colors, ENABLE_COLOR} from '#cli';

function inspect(value) {
  return nodeInspect(value, {colors: ENABLE_COLOR});
}

export default class CacheableObject {
  static propertyDescriptors = Symbol.for('CacheableObject.propertyDescriptors');
  static constructorFinalized = Symbol.for('CacheableObject.constructorFinalized');
  static propertyDependants = Symbol.for('CacheableObject.propertyDependants');

  static cacheValid = Symbol.for('CacheableObject.cacheValid');
  static cachedValue = Symbol.for('CacheableObject.cachedValue');
  static updateValue = Symbol.for('CacheableObject.updateValues');

  constructor({seal = true} = {}) {
    this[CacheableObject.cachedValue] = Object.create(null);
    this[CacheableObject.cacheValid] = Object.create(null);

    this[CacheableObject.updateValue] =
      Object.create(this[CacheableObject.updateValue]);

    if (seal) {
      Object.seal(this);
    }
  }

  static finalizeCacheableObjectPrototype() {
    if (Object.hasOwn(this, CacheableObject.constructorFinalized)) {
      throw new Error(`Constructor ${this.name} already finalized`);
    }

    if (!this[CacheableObject.propertyDescriptors]) {
      throw new Error(`Expected constructor ${this.name} to provide CacheableObject.propertyDescriptors`);
    }

    const propertyDescriptors = this[CacheableObject.propertyDescriptors];

    // Finalize prototype update value

    this.prototype[CacheableObject.updateValue] =
      Object.create(
        Object.getPrototypeOf(this.prototype)[CacheableObject.updateValue] ??
        null);

    for (const property of Reflect.ownKeys(propertyDescriptors)) {
      const {flags, update} = propertyDescriptors[property];
      if (!flags.update) continue;

      if (typeof update === 'object' && update !== null && 'default' in update) {
        if (update.validate) {
          validatePropertyValue(property, null, update.default, update);
        }

        this.prototype[CacheableObject.updateValue][property] = update.default;
      } else {
        this.prototype[CacheableObject.updateValue][property] = null;
      }
    }

    // Finalize prototype property descriptors

    this[CacheableObject.propertyDependants] = Object.create(null);

    for (const property of Reflect.ownKeys(propertyDescriptors)) {
      const {flags, update, expose} = propertyDescriptors[property];

      const definition = {
        configurable: false,
        enumerable: flags.expose,
      };

      if (flags.update) setSetter: {
        definition.set = function(newValue) {
          if (newValue === undefined) {
            throw new TypeError(`Properties cannot be set to undefined`);
          }

          const oldValue = this[CacheableObject.updateValue][property];

          if (newValue === oldValue) {
            return;
          }

          if (newValue !== null && update?.validate) {
            validatePropertyValue(property, oldValue, newValue, update);
          }

          this[CacheableObject.updateValue][property] = newValue;

          const dependants = this.constructor[CacheableObject.propertyDependants][property];
          if (dependants) {
            for (const dependant of dependants) {
              this[CacheableObject.cacheValid][dependant] = false;
            }
          }
        };
      }

      if (flags.expose) setGetter: {
        if (flags.update && !expose?.transform) {
          definition.get = function() {
            return this[CacheableObject.updateValue][property];
          };

          break setGetter;
        }

        if (flags.update && expose?.compute) {
          throw new Error(`Updating property ${property} has compute function, should be formatted as transform`);
        }

        if (!flags.update && !expose?.compute) {
          throw new Error(`Exposed property ${property} does not update and is missing compute function`);
        }

        definition.get = function() {
          if (this[CacheableObject.cacheValid][property]) {
            return this[CacheableObject.cachedValue][property];
          }

          const dependencies = Object.create(null);
          for (const key of expose.dependencies ?? []) {
            if (key === 'this') {
              dependencies.this = this;
            } else if (key === 'thisProperty') {
              dependencies.thisProperty = property;
            } else if (key.startsWith('_')) {
              dependencies[key] = this[CacheableObject.updateValue][key.slice(1)];
            } else {
              dependencies[key] = this[key];
            }
          }

          const value =
            (flags.update
              ? expose.transform(this[CacheableObject.updateValue][property], dependencies)
              : expose.compute(dependencies));

          this[CacheableObject.cachedValue][property] = value;
          this[CacheableObject.cacheValid][property] = true;

          return value;
        };
      }

      if (flags.expose) recordAsDependant: {
        const dependantsMap = this[CacheableObject.propertyDependants];

        for (const dependency of dependenciesOf(property, propertyDescriptors)) {
          if (dependantsMap[dependency]) {
            dependantsMap[dependency].push(property);
          } else {
            dependantsMap[dependency] = [property];
          }
        }
      }

      Object.defineProperty(this.prototype, property, definition);
    }

    this[CacheableObject.constructorFinalized] = true;
  }

  static getPropertyDescriptor(property) {
    return this[CacheableObject.propertyDescriptors][property];
  }

  static hasPropertyDescriptor(property) {
    return property in this[CacheableObject.propertyDescriptors];
  }

  static cacheAllExposedProperties(obj) {
    if (!(obj instanceof CacheableObject)) {
      console.warn('Not a CacheableObject:', obj);
      return;
    }

    const {[CacheableObject.propertyDescriptors]: propertyDescriptors} =
      obj.constructor;

    if (!propertyDescriptors) {
      console.warn('Missing property descriptors:', obj);
      return;
    }

    for (const property of Reflect.ownKeys(propertyDescriptors)) {
      const {flags} = propertyDescriptors[property];
      if (!flags.expose) {
        continue;
      }

      obj[property];
    }
  }

  static getUpdateValue(object, key) {
    if (!object.constructor.hasPropertyDescriptor(key)) {
      return undefined;
    }

    return object[CacheableObject.updateValue][key] ?? null;
  }

  static clone(object) {
    const newObject = Reflect.construct(object.constructor, []);

    this.copyUpdateValuesOnto(object, newObject);

    return newObject;
  }

  static copyUpdateValuesOnto(source, target) {
    Object.assign(target, source[CacheableObject.updateValue]);
  }
}

export class CacheableObjectPropertyValueError extends Error {
  [Symbol.for('hsmusic.aggregate.translucent')] = true;

  constructor(property, oldValue, newValue, options) {
    let inspectOldValue, inspectNewValue;

    try {
      inspectOldValue = inspect(oldValue);
    } catch {
      inspectOldValue = colors.red(`(couldn't inspect)`);
    }

    try {
      inspectNewValue = inspect(newValue);
    } catch {
      inspectNewValue = colors.red(`(couldn't inspect)`);
    }

    super(
      `Error setting ${colors.green(property)} (${inspectOldValue} -> ${inspectNewValue})`,
      options);

    this.property = property;
  }
}

// good ol' module-scope utility functions

function validatePropertyValue(property, oldValue, newValue, update) {
  try {
    const result = update.validate(newValue);
    if (result === undefined) {
      throw new TypeError(`Validate function returned undefined`);
    } else if (result !== true) {
      throw new TypeError(`Validation failed for value ${newValue}`);
    }
  } catch (caughtError) {
    throw new CacheableObjectPropertyValueError(
      property, oldValue, newValue, {cause: caughtError});
  }
}

function* dependenciesOf(property, propertyDescriptors, cycle = []) {
  const descriptor = propertyDescriptors[property];

  if (descriptor?.flags?.update) {
    yield property;
  }

  const dependencies = descriptor?.expose?.dependencies;
  if (!dependencies) return;

  for (const dependency of dependencies) {
    if (dependency === 'this') continue;
    if (dependency === 'thisProperty') continue;

    if (dependency.startsWith('_')) {
      yield dependency.slice(1);
      continue;
    }

    if (dependency === property) {
      throw new Error(
        `property ${dependency} directly depends on its own computed value`);
    }

    if (cycle.includes(dependency)) {
      const subcycle = cycle.slice(cycle.indexOf(dependency));
      const supercycle = cycle.slice(0, cycle.indexOf(dependency));
      throw new Error(
        `property ${dependency} indirectly depends on its own computed value\n` +
        `  via: ` + subcycle.map(p => p + ' -> ').join('') + property + ' -> ' + dependency +
        (supercycle.length
          ? '\n   in: ' + supercycle.join(' -> ')
          : ''));
    }

    cycle.push(property);
    yield* dependenciesOf(dependency, propertyDescriptors, cycle);
    cycle.pop();
  }
}
