// A wiki data object's name! Its directory (i.e. unique identifier) will be
// computed based on this value if not otherwise specified.

import {isName} from '#validators';

export default function(defaultName) {
  return {
    flags: {update: true, expose: true},
    update: {validate: isName, default: defaultName},
  };
}
