// String type that's slightly more specific than simpleString. If the
// property is a generic piece of human-reading content, this adds some
// useful valiation on top of simpleString - but still check if more
// particular properties like `name` are more appropriate.
//
// This type adapts validation for single- and multiline content.

import {isContentString} from '#validators';

export default function() {
  return {
    flags: {update: true, expose: true},
    update: {validate: isContentString},
  };
}
