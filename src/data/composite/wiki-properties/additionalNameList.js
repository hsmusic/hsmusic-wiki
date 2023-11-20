// A list of additional names! These can be used for a variety of purposes,
// e.g. providing extra searchable titles, localizations, romanizations or
// original titles, and so on. Each item has a name and, optionally, a
// descriptive annotation.

import {isAdditionalNameList} from '#validators';

export default function() {
  return {
    flags: {update: true, expose: true},
    update: {validate: isAdditionalNameList},
  };
}
