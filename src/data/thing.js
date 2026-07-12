// Thing: base class for wiki data types, providing interfaces generally useful
// to all wiki data objects on top of foundational CacheableObject behavior.

import {inspect} from 'node:util';

import CacheableObject from '#cacheable-object';
import {colors} from '#cli';

export default class Thing extends CacheableObject {
  static referenceType = Symbol.for('Thing.referenceType');
  static friendlyName = Symbol.for('Thing.friendlyName');

  static wikiData = Symbol.for('Thing.wikiData');
  static oneInstancePerWiki = Symbol.for('Thing.oneThingPerWiki');
  static constitutibleProperties = Symbol.for('Thing.constitutibleProperties');

  static getPropertyDescriptors = Symbol.for('Thing.getPropertyDescriptors');
  static getSerializeDescriptors = Symbol.for('Thing.getSerializeDescriptors');

  static findSpecs = Symbol.for('Thing.findSpecs');
  static findThisThingOnly = Symbol.for('Thing.findThisThingOnly');

  static reverseSpecs = Symbol.for('Thing.reverseSpecs');

  static yamlDocumentSpec = Symbol.for('Thing.yamlDocumentSpec');

  static yamlSourceFilename = Symbol.for('Thing.yamlSourceFilename');
  static yamlSourceDocument = Symbol.for('Thing.yamlSourceDocument');
  static yamlSourceDocumentPlacement = Symbol.for('Thing.yamlSourceDocumentPlacement');

  [Symbol.for('Thing.yamlSourceFilename')] = null;
  [Symbol.for('Thing.yamlSourceDocument')] = null;
  [Symbol.for('Thing.yamlSourceDocumentPlacement')] = null;

  static isThingConstructor = Symbol.for('Thing.isThingConstructor');
  static isThing = Symbol.for('Thing.isThing');

  // To detect:
  // Symbol.for('Thing.isThingConstructor') in constructor
  static [Symbol.for('Thing.isThingConstructor')] = NaN;

  constructor() {
    super({seal: false});

    // To detect:
    // Object.hasOwn(object, Symbol.for('Thing.isThing'))
    this[Symbol.for('Thing.isThing')] = NaN;

    Object.seal(this);
  }

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
    } catch {
      name = colors.yellow(`couldn't get name`);
    }

    let reference =
      Thing.inspectReference(this, {
        showConstructor: false,
        showName: false,
      });

    return (
      (name ? `${constructorName} ${name}` : `${constructorName}`) +
      (reference ? ` (${reference})` : ''));
  }

  static clone(source, {as = null} = {}) {
    if (!(source instanceof this)) {
      throw new TypeError(
        `Passed thing is ${source.constructor.name}, ` +
        `which is not a subclass of ${this.name}`);
    }

    if (as && !(as.prototype instanceof this)) {
      throw new TypeError(
        `Passed constructor is ${as.name}, ` +
        `which is not a subclass of ${this.name}`);
    }

    let clone;

    if (as) {
      clone = Reflect.construct(as, []);
    } else {
      clone = Reflect.construct(source.constructor, []);
    }

    CacheableObject.copyUpdateValuesOnto(source, clone);

    return clone;
  }

  static getReference(thing) {
    if (!thing.constructor[Thing.referenceType]) {
      throw TypeError(
        `Passed Thing is ${thing.constructor.name}, ` +
        `which provides no [Thing.referenceType]`);
    }

    if (!thing.directory) {
      if (thing.name) {
        throw TypeError(
          `Passed ${thing.constructor.name} (named ${inspect(thing.name)}) ` +
          `is missing its directory`);
      } else {
        throw TypeError(`Passed ${thing.constructor.name} is missing its directory`);
      }
    }

    return `${thing.constructor[Thing.referenceType]}:${thing.directory}`;
  }

  static inspectReference(thing, {
    showConstructor = true,
    showName = true,
  } = {}) {
    const referenceType =
      thing.constructor[Thing.referenceType] ??
      null;

    const constructorPart =
      (showConstructor
        ? `${thing.constructor.name} `
        : ``);

    let errored = false;
    const tryToGet = property => {
      try {
        return thing[property] ?? null;
      } catch {
        errored = true;
        return null;
      }
    };

    const directoryPart = this.inspectDirectory(thing);
    const directoryErrored = directoryPart === null;

    if (directoryPart && referenceType) {
      return colors.blue(`${referenceType}:${directoryPart}`);
    } if (directoryPart) {
      return constructorPart + `${colors.blue(directoryPart)}`;
    } else if (showName && tryToGet('name')) {
      return constructorPart + `named ${inspect(thing.name)}`;
    } else if (errored && directoryErrored) {
      return constructorPart + `${colors.yellow(`couldn't compute reference`)}`;
    } else {
      return constructorPart;
    }
  }

  static inspectDirectory(thing) {
    let errored = false;
    const tryToGet = property => {
      try {
        return thing[property] ?? null;
      } catch {
        errored = true;
        return null;
      }
    };

    if (tryToGet('directory')) {
      return thing.directory;
    } else if (tryToGet('unqualifiedDirectory')) {
      return `…${thing.unqualifiedDirectory}`;
    } else if (errored) {
      return null;
    } else {
      return '';
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
