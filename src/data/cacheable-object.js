// Generally extendable class for caching properties and handling dependencies,
// with a few key properties:
//
// 1) The behavior of every property is defined by its descriptor, which is a
//    static value stored on the subclass (all instances share the same property
//    descriptors).
//
//  1a) Additional properties may not be added past the time of object
//      construction, and attempts to do so (including externally setting a
//      property name which has no corresponding descriptor) will throw a
//      TypeError. (This is done via an Object.seal(this) call after a newly
//      created instance defines its own properties according to the descriptor
//      on its constructor class.)
//
// 2) Properties may have two flags set: update and expose. Properties which
//    update are provided values from the external. Properties which expose
//    provide values to the external, generally dependent on other update
//    properties (within the same object).
//
//  2a) Properties may be flagged as both updating and exposing. This is so
//      that the same name may be used for both "output" and "input".
//
// 3) Exposed properties have values which are computations dependent on other
//    properties, as described by a `compute` function on the descriptor.
//    Depended-upon properties are explicitly listed on the descriptor next to
//    this function, and are only provided as arguments to the function once
//    listed.
//
//  3a) An exposed property may depend only upon updating properties, not other
//      exposed properties (within the same object). This is to force the
//      general complexity of a single object to be fairly simple: inputs
//      directly determine outputs, with the only in-between step being the
//      `compute` function, no multiple-layer dependencies. Note that this is
//      only true within a given object - externally, values provided to one
//      object's `update` may be (and regularly are) the exposed values of
//      another object.
//
//  3b) If a property both updates and exposes, it is automatically regarded as
//      a dependancy. (That is, its exposed value will depend on the value it is
//      updated with.) Rather than a required `compute` function, these have an
//      optional `transform` function, which takes the update value as its first
//      argument and then the usual key-value dependencies as its second. If no
//      `transform` function is provided, the expose value is the same as the
//      update value.
//
// 4) Exposed properties are cached; that is, if no depended-upon properties are
//    updated, the value of an exposed property is not recomputed.
//
//  4a) The cache for an exposed property is invalidated as soon as any of its
//      dependencies are updated, but the cache itself is lazy: the exposed
//      value will not be recomputed until it is again accessed. (Likewise, an
//      exposed value won't be computed for the first time until it is first
//      accessed.)
//
// 5) Updating a property may optionally apply validation checks before passing,
//    declared by a `validate` function on the `update` block. This function
//    should either throw an error (e.g. TypeError) or return false if the value
//    is invalid.
//
// 6) Objects do not expect all updating properties to be provided at once.
//    Incomplete objects are deliberately supported and enabled.
//
//  6a) The default value for every updating property is null; undefined is not
//      accepted as a property value under any circumstances (it always errors).
//      However, this default may be overridden by specifying a `default` value
//      on a property's `update` block. (This value will be checked against
//      the property's validate function.) Note that a property may always be
//      updated to null, even if the default is non-null. (Null always bypasses
//      the validate check.)
//
//  6b) It's required by the external consumer of an object to determine whether
//      or not the object is ready for use (within the larger program). This is
//      convenienced by the static CacheableObject.listAccessibleProperties()
//      function, which provides a mapping of exposed property names to whether
//      or not their dependencies are yet met.

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

  static DEBUG_SLOW_TRACK_INVALID_PROPERTIES = false;
  static _invalidAccesses = new Set();

  static showInvalidAccesses() {
    if (!this.DEBUG_SLOW_TRACK_INVALID_PROPERTIES) {
      return;
    }

    if (!this._invalidAccesses.size) {
      return;
    }

    console.log(`${this._invalidAccesses.size} unique invalid accesses:`);
    for (const line of this._invalidAccesses) {
      console.log(` - ${line}`);
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
