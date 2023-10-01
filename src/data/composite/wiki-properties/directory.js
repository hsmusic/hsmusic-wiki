// The all-encompassing "directory" property, used as the unique identifier for
// almost any data object. Also corresponds to a part of the URL which pages of
// such objects are visited at.

import {isDirectory} from '#validators';
import {getKebabCase} from '#wiki-data';

// TODO: Not templateCompositeFrom.

export default function() {
  return {
    flags: {update: true, expose: true},
    update: {validate: isDirectory},
    expose: {
      dependencies: ['name'],
      transform(directory, {name}) {
        if (directory === null && name === null) return null;
        else if (directory === null) return getKebabCase(name);
        else return directory;
      },
    },
  };
}
