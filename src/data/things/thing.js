// Thing: base class for wiki data types, providing interfaces generally useful
// to all wiki data objects on top of foundational CacheableObject behavior.

import {inspect} from 'node:util';

import {colors} from '#cli';

import CacheableObject from './cacheable-object.js';

export default class Thing extends CacheableObject {
  static referenceType = Symbol.for('Thing.referenceType');

  static getPropertyDescriptors = Symbol('Thing.getPropertyDescriptors');
  static getSerializeDescriptors = Symbol('Thing.getSerializeDescriptors');

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
}
