// General date type, used as the descriptor for a bunch of properties.
// This isn't dynamic though - it won't inherit from a date stored on
// another object, for example.

import {isDate} from '#validators';

// TODO: Not templateCompositeFrom.

export default function() {
  return {
    flags: {update: true, expose: true},
    update: {validate: isDate},
  };
}
