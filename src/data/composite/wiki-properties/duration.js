// Duration! This is a number of seconds, possibly floating point, always
// at minimum zero.

import {isDuration} from '#validators';

// TODO: Not templateCompositeFrom.

export default function() {
  return {
    flags: {update: true, expose: true},
    update: {validate: isDuration},
  };
}
