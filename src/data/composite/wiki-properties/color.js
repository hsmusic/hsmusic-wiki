// A color! This'll be some CSS-ready value.

import {isColor} from '#validators';

// TODO: Not templateCompositeFrom.

export default function() {
  return {
    flags: {update: true, expose: true},
    update: {validate: isColor},
  };
}
