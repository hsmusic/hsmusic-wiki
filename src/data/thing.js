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

  // Default custom inspect function, which may be overridden by Thing
  // subclasses. This will be used when displaying aggregate errors and other
  // command-line logging - it's the place to provide information useful in
  // identifying the Thing being presented.
  [inspect.custom]() {
    const cname = this.constructor.name;

    return (
      (this.name ? `${cname} ${colors.green(`"${this.name}"`)}` : `${cname}`) +
      (this.directory ? ` (${colors.blue(Thing.getReference(this))})` : '')
    );
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

    return results;
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
