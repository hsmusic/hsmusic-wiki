// A list of URLs! This will always be present on the data object, even if set
// to an empty array or null.

import {isCuratedURLList} from '#validators';
import {templateCompositeFrom} from '#composite';

export default function() {
  return {
    flags: {update: true, expose: true},
    update: {validate: isCuratedURLList},
    expose: {transform: value => value ?? []},
  };
}
