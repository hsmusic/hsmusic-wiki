// A list of URLs! This will always be present on the data object, even if set
// to an empty array or null.

import {isURL, validateArrayItems} from '#validators';

// TODO: Not templateCompositeFrom.

export default function() {
  return {
    flags: {update: true, expose: true},
    update: {validate: validateArrayItems(isURL)},
    expose: {transform: value => value ?? []},
  };
}
