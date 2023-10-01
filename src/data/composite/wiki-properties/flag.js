// Straightforward flag descriptor for a variety of property purposes.
// Provide a default value, true or false!

import {isBoolean} from '#validators';

// TODO: Not templateCompositeFrom.

// TODO: The description is a lie. This defaults to false. Bad.

export default function(defaultValue = false) {
  if (typeof defaultValue !== 'boolean') {
    throw new TypeError(`Always set explicit defaults for flags!`);
  }

  return {
    flags: {update: true, expose: true},
    update: {validate: isBoolean, default: defaultValue},
  };
}
