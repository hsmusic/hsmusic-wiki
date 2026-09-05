import {V} from '#composite';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';
import {simpleString} from '#composite/wiki-properties';

import {SoundDetail} from './SoundDetail.js';

export class TimeSignatureSoundDetail extends SoundDetail {
  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    timeSignature: simpleString(),

    // Expose only

    kind: exposeConstant(V('time signature')),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Time Signature': {property: 'timeSignature'},
    },
  };
}
