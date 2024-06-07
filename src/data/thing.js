// Thing: base class for wiki data types, providing interfaces generally useful
// to all wiki data objects on top of foundational CacheableObject behavior.

import {inspect} from 'node:util';

import CacheableObject from '#cacheable-object';
import {colors} from '#cli';
import {compositeFrom} from '#composite';

export default class Thing extends CacheableObject {
  static referenceType = Symbol.for('Thing.referenceType');
  static friendlyName = Symbol.for('Thing.friendlyName');

  static getPropertyDescriptors = Symbol.for('Thing.getPropertyDescriptors');
  static getSerializeDescriptors = Symbol.for('Thing.getSerializeDescriptors');

  static findSpecs = Symbol.for('Thing.findSpecs');
  static yamlDocumentSpec = Symbol.for('Thing.yamlDocumentSpec');
  static getYamlLoadingSpec = Symbol.for('Thing.getYamlLoadingSpec');

  static isThingConstructor = Symbol.for('Thing.isThingConstructor');
  static isThing = Symbol.for('Thing.isThing');

  // To detect:
  // Symbol.for('Thing.isThingConstructor') in constructor
  static [Symbol.for('Thing.isThingConstructor')] = NaN;

  static [CacheableObject.propertyDescriptors] = {
    // To detect:
    // Object.hasOwn(object, Symbol.for('Thing.isThing'))
    [Symbol.for('Thing.isThing')]: {
      flags: {expose: true},
      expose: {compute: () => NaN},
    },
  };

  static [Symbol.for('Thing.selectAll')] = _wikiData => [];

  // Magical constructor function that is the real entry point for, well,
  // constructing any Thing subclass. Refer to the section about property
  // descriptors later in this class for the high-level overview!
  constructor() {
    super(Thing.acquirePropertyDescriptors(new.target));
  }

  // Default custom inspect function, which may be overridden by Thing
  // subclasses. This will be used when displaying aggregate errors and other
  // command-line logging - it's the place to provide information useful in
  // identifying the Thing being presented.
  [inspect.custom]() {
    const constructorName = this.constructor.name;

    let name;
    try {
      if (this.name) {
        name = colors.green(`"${this.name}"`);
      }
    } catch (error) {
      name = colors.yellow(`couldn't get name`);
    }

    let reference;
    try {
      if (this.directory) {
        reference = colors.blue(Thing.getReference(this));
      }
    } catch (error) {
      reference = colors.yellow(`couldn't get reference`);
    }

    return (
      (name ? `${constructorName} ${name}` : `${constructorName}`) +
      (reference ? ` (${reference})` : ''));
  }

  static getReference(thing) {
    if (!thing.constructor[Thing.referenceType]) {
      throw TypeError(`Passed Thing is ${thing.constructor.name}, which provides no [Thing.referenceType]`);
    }

    if (!thing.directory) {
      throw TypeError(`Passed ${thing.constructor.name} is missing its directory`);
    }

    return `${thing.constructor[Thing.referenceType]}:${thing.directory}`;
  }

  // The terminology around property descriptors is kind of pathetic, because
  // there just aren't enough verbs! Here's the rundown:
  //
  // static Thing.getPropertyDescriptors:
  //   This is a *well-known symbol*. Subclasses use it to declare their
  //   property descriptors.
  //
  // static [Thing.getPropertyDescriptors](thingConstructors):
  //   This is a *static method* that subclasses of Thing define. It returns
  //   the property descriptors which are meaningful on that class, as well as
  //   its own subclasses (unless overridden). It takes thingConstructors like
  //   other utility functions - these are the identities of the constructors
  //   which its own property descriptors may access.
  //
  // static Thing.preparePropertyDescriptors(thingConstructors):
  //   This is a *static method* that Thing itself defines. It is a utility
  //   function which calls Thing.decidePropertyDescriptors on each of the
  //   provided constructors.
  //
  // static Thing.decidePropertyDescriptors(constructor, thingConstructors):
  //   This is a *static method* that Thing itself defines. It is a primitive
  //   function which calls Thing.computePropertyDescriptors and declares its
  //   result as the property descriptors which all instances of the provided
  //   Thing subclass will use. Before it is called, it's impossible to
  //   construct that particular subclass. Likewise, you can't ever call it
  //   again for the same constructor.
  //
  // static Thing.computePropertyDescriptors(constructor, thingConstructors):
  //   This is a *static method* that Thing itself defines. It is a primitive
  //   function that does some inheritence shenanigans to combine property
  //   descriptors statically defined on the provided Thing subclass as well
  //   as its superclasses, on both [CacheableObject.propertyDescriptors] and
  //   [Thing.getPropertyDescriptors], the latter of which it's responsible
  //   for calling. Unlike Thing.decidePropertyDescriptors, this function can
  //   be called any number of times for the same constructor - but it never
  //   actually stores anything to do with the constructor, so on its own it
  //   can only be used for introspection or "imagining" what a class would
  //   look like contextualized with different thingConstructors.
  //
  // static Thing.acquirePropertyDescriptors(constructor):
  //   This is a *static method* that Thing itself defines. It is a primitive
  //   function which gets the previously decided property descriptors to use
  //   for the provided Thing subclass. If it hasn't yet been decided, this
  //   throws an error. This is used when constructing instances of Thing
  //   subclasses, to ~get~ ~decide~ *acquire* the property descriptors which
  //   are provided to the CacheableObject super() constructing call.
  //
  // Kapiche? Nice!

  static #propertyDescriptorCache = new WeakMap();

  static preparePropertyDescriptors(thingConstructors) {
    for (const constructor of Object.values(thingConstructors)) {
      Thing.decidePropertyDescriptors(constructor, thingConstructors);
    }
  }

  static decidePropertyDescriptors(constructor, thingConstructors) {
    if (this.#propertyDescriptorCache.has(constructor)) {
      throw new Error(
        `Constructor ${constructor.name} has already had its property descriptors decided`);
    } else {
      this.#propertyDescriptorCache.set(
        constructor,
        this.computePropertyDescriptors(constructor, thingConstructors));
    }
  }

  static computePropertyDescriptors(constructor, thingConstructors) {
    let topOfChain = null;

    const superclass =
      Object.getPrototypeOf(constructor) ?? null;

    if (superclass) {
      const superDescriptors =
        (superclass
          ? Thing.computePropertyDescriptors(superclass, thingConstructors)
          : null);

      topOfChain = superDescriptors;
    }

    if (Object.hasOwn(constructor, CacheableObject.propertyDescriptors)) {
      const classDescriptors = Object.create(topOfChain);

      Object.assign(classDescriptors, constructor[CacheableObject.propertyDescriptors]);
      Object.seal(classDescriptors);

      topOfChain = classDescriptors;
    }

    if (Object.hasOwn(constructor, Thing.getPropertyDescriptors)) {
      const thingDescriptors = Object.create(topOfChain);

      const results =
        constructor[Thing.getPropertyDescriptors](thingConstructors);

      for (const [key, value] of Object.entries(results)) {
        if (Array.isArray(value)) {
          results[key] =
            compositeFrom({
              annotation: `${constructor.name}.${key}`,
              compose: false,
              steps: value,
            });
        } else if (value.toResolvedComposition) {
          results[key] =
            compositeFrom(value.toResolvedComposition());
        }
      }

      Object.assign(thingDescriptors, results);
      Object.seal(thingDescriptors);

      topOfChain = thingDescriptors;
    }

    return topOfChain;
  }

  static acquirePropertyDescriptors(constructor) {
    if (this.#propertyDescriptorCache.has(constructor)) {
      return this.#propertyDescriptorCache.get(constructor);
    } else {
      throw new Error(
        `Constructor ${constructor.name} never had its property descriptors decided`);
    }
  }

  static extendDocumentSpec(thingClass, subspec) {
    const superspec = thingClass[Thing.yamlDocumentSpec];

    const {
      fields,
      ignoredFields,
      invalidFieldCombinations,
      ...restOfSubspec
    } = subspec;

    const newFields = Object.keys(fields ?? {});

    return {
      ...superspec,
      ...restOfSubspec,

      fields: {
        ...superspec.fields ?? {},
        ...fields,
      },

      ignoredFields:
        (superspec.ignoredFields ?? [])
          .filter(field => newFields.includes(field))
          .concat(ignoredFields ?? []),

      invalidFieldCombinations: [
        ...superspec.invalidFieldCombinations ?? [],
        ...invalidFieldCombinations ?? [],
      ],
    };
  }
}
