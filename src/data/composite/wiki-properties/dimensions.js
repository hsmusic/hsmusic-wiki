// Plain ol' image dimensions. This is a two-item array of positive integers,
// corresponding to width and height respectively.

import {isDimensions} from '#validators';

// TODO: Not templateCompositeFrom.

export default function() {
  return {
    flags: {update: true, expose: true},
    update: {validate: isDimensions},
  };
}
