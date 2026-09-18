import {V} from '#composite';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';
import {simpleString} from '#composite/wiki-properties';

import {SoundDetail} from './SoundDetail.js';

export class VSTSoundDetail extends SoundDetail {
  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    name: simpleString(),

    // Expose only

    kind: exposeConstant(V('vst')),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'VST': {property: 'name'},
    },
  };
}
