// General string type. This should probably generally be avoided in favor
// of more specific validation, but using it makes it easy to find where we
// might want to improve later, and it's a useful shorthand meanwhile.

import {isString} from '#validators';

export default function() {
  return {
    flags: {update: true, expose: true},
    update: {validate: isString},
  };
}
