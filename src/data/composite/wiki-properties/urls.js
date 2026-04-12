// A list of URLs! This will always be present on the data object, even if set
// to an empty array or null.

import {isCuratedURL, validateArrayItems} from '#validators';

// TODO: Not templateCompositeFrom.

export default function() {
  return {
    flags: {update: true, expose: true},
    update: {validate: validateArrayItems(isCuratedURL)},
    expose: {transform: value => value ?? []},
  };
}
