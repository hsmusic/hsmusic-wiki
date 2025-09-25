// Time into a duration! This is... exactly the same type as a duration.

import {isTimeIntoDuration} from '#validators';

// TODO: Not templateCompositeFrom.

export default function() {
  return {
    flags: {update: true, expose: true},
    update: {validate: isTimeIntoDuration},
  };
}
