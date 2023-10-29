// A file extension! Or the default, if provided when calling this.

import {isFileExtension} from '#validators';

// TODO: Not templateCompositeFrom.

export default function(defaultFileExtension = null) {
  return {
    flags: {update: true, expose: true},
    update: {validate: isFileExtension},
    expose: {transform: (value) => value ?? defaultFileExtension},
  };
}
