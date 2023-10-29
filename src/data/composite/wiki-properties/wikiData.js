// General purpose wiki data constructor, for properties like artistData,
// trackData, etc.

import {validateArrayItems, validateInstanceOf} from '#validators';

// TODO: Not templateCompositeFrom.

// TODO: This should validate with validateWikiData.

export default function(thingClass) {
  return {
    flags: {update: true},
    update: {
      validate: validateArrayItems(validateInstanceOf(thingClass)),
    },
  };
}
