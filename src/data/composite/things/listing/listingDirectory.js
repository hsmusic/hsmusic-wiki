// Listings don't have names the same way most Things do, so their directories
// don't compute based on a name (when unset). They also have a different set
// of allowed characters.

import {isListingDirectory} from '#validators';
import {getKebabCase} from '#wiki-data';

export default function() {
  return {
    flags: {update: true, expose: true},
    update: {validate: isListingDirectory},
  };
}
