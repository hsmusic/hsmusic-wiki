// General purpose wiki data constructor, for properties like artistData,
// trackData, etc.

import {validateWikiData} from '#validators';

// TODO: Kludge.
import Thing from '../../things/thing.js';

// TODO: Not templateCompositeFrom.

export default function(thingClass) {
  const referenceType = thingClass[Thing.referenceType];

  return {
    flags: {update: true},
    update: {
      validate: validateWikiData({referenceType}),
    },
  };
}
