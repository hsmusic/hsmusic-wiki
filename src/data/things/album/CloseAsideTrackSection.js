// Mock thing that stands in for closing an "aside" track section.
// Only exists while loading, is discarded during connect().

import Thing from '#thing';
import {isString} from '#validators';

export class CloseAsideTrackSection extends Thing {
  static [Thing.getPropertyDescriptors] = () => ({
    name: {
      flags: {update: true, expose: true},
      update: {validate: isString},
    },
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Close Aside Section': {property: 'name'},
    },
  };
}
