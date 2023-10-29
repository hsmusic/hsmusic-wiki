// Please note that this input, used in a variety of #composite/wiki-data
// utilities, is basically always a kludge. Any usage of it depends on
// referencing Thing class values defined outside of the #composite folder.

import {input} from '#composite';
import {isType} from '#validators';

// TODO: Kludge.
import Thing from '../../things/thing.js';

export default function inputThingClass() {
  return input.staticValue({
    validate(thingClass) {
      isType(thingClass, 'function');

      if (!Object.hasOwn(thingClass, Thing.referenceType)) {
        throw new TypeError(`Expected a Thing constructor, missing Thing.referenceType`);
      }

      return true;
    },
  });
}
