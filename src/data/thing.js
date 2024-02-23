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

  static computePropertyDescriptors(constructor, {
    thingConstructors,
  }) {
    if (!constructor[Thing.getPropertyDescriptors]) {
      throw new Error(`Missing [Thing.getPropertyDescriptors] function`);
    }

    const results =
      constructor[Thing.getPropertyDescriptors](thingConstructors);

    for (const [key, value] of Object.entries(results)) {
      if (Array.isArray(value)) {
        results[key] = compositeFrom({
          annotation: `${constructor.name}.${key}`,
          compose: false,
          steps: value,
        });
      } else if (value.toResolvedComposition) {
        results[key] = compositeFrom(value.toResolvedComposition());
      }
    }

    return {
      ...constructor[CacheableObject.propertyDescriptors] ?? {},
      ...results,
    };
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
