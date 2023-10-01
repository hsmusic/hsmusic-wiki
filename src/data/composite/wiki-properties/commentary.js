// Artist commentary! Generally present on tracks and albums.

import {isCommentary} from '#validators';

// TODO: Not templateCompositeFrom.

export default function() {
  return {
    flags: {update: true, expose: true},
    update: {validate: isCommentary},
  };
}
