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
  static updateValue = Symbol.for('CacheableObject.updateValues');

  constructor() {
    this[CacheableObject.updateValue] = Object.create(null);
    this[CacheableObject.cachedValue] = Object.create(null);
    this[CacheableObject.cacheValid] = Object.create(null);

    const propertyDescriptors = this.constructor[CacheableObject.propertyDescriptors];
    for (const property of Reflect.ownKeys(propertyDescriptors)) {
      const {flags, update} = propertyDescriptors[property];
      if (!flags.update) continue;

      if (
        typeof update === 'object' &&
        update !== null &&
        'default' in update
      ) {
        this[property] = update?.default;
      } else {
        this[property] = null;
      }
    }
  }

  static finalizeCacheableObjectPrototype() {
    if (this[CacheableObject.constructorFinalized]) {
      throw new Error(`Constructor ${this.name} already finalized`);
    }

    if (!this[CacheableObject.propertyDescriptors]) {
      throw new Error(`Expected constructor ${this.name} to provide CacheableObject.propertyDescriptors`);
    }

    this[CacheableObject.constructorFinalized] = true;
    this[CacheableObject.propertyDependants] = Object.create(null);

    const propertyDescriptors = this[CacheableObject.propertyDescriptors];
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

          this[CacheableObject.cacheValid][property] = true;

          const dependencies = Object.create(null);
          for (const key of expose.dependencies ?? []) {
            switch (key) {
              case 'this':
                dependencies.this = this;
                break;

              case 'thisProperty':
                dependencies.thisProperty = property;
                break;

              default:
                dependencies[key] = this[CacheableObject.updateValue][key];
                break;
            }
          }

          const value =
            (flags.update
              ? expose.transform(this[CacheableObject.updateValue][property], dependencies)
              : expose.compute(dependencies));

          this[CacheableObject.cachedValue][property] = value;

          return value;
        };
      }

      if (flags.expose) recordAsDependant: {
        const dependantsMap = this[CacheableObject.propertyDependants];

        if (flags.update && expose?.transform) {
          if (dependantsMap[property]) {
            dependantsMap[property].push(property);
          } else {
            dependantsMap[property] = [property];
          }
        }

        for (const dependency of expose?.dependencies ?? []) {
          switch (dependency) {
            case 'this':
            case 'thisProperty':
              continue;

            default: {
              if (dependantsMap[dependency]) {
                dependantsMap[dependency].push(property);
              } else {
                dependantsMap[dependency] = [property];
              }
            }
          }
        }
      }

      Object.defineProperty(this.prototype, property, definition);
    }
  }

  static getPropertyDescriptor(property) {
    return this[CacheableObject.propertyDescriptors][property];
  }

  static hasPropertyDescriptor(property) {
    return Object.hasOwn(this[CacheableObject.propertyDescriptors], property);
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
    } catch (error) {
      inspectOldValue = colors.red(`(couldn't inspect)`);
    }

    try {
      inspectNewValue = inspect(newValue);
    } catch (error) {
      inspectNewValue = colors.red(`(couldn't inspect)`);
    }

    super(
      `Error setting ${colors.green(property)} (${inspectOldValue} -> ${inspectNewValue})`,
      options);

    this.property = property;
  }
}
