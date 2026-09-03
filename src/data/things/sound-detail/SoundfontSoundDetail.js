import {V} from '#composite';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';
import {simpleString} from '#composite/wiki-properties';

import {SoundDetail} from './SoundDetail.js';

export class SoundfontSoundDetail extends SoundDetail {
  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    name: simpleString(),
    bank: simpleString(),

    // Expose only

    kind: exposeConstant(V('soundfont')),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Soundfont': {property: 'name'},
      'Bank': {property: 'bank'},
    },
  };
}
