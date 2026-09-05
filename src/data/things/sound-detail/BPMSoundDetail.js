import {V} from '#composite';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';
import {simpleString} from '#composite/wiki-properties';

import {SoundDetail} from './SoundDetail.js';

export class BPMSoundDetail extends SoundDetail {
  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    bpm: simpleString(),

    // Expose only

    kind: exposeConstant(V('bpm')),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'BPM': {property: 'bpm'},
    },
  };
}
