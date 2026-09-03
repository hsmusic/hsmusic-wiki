import {V} from '#composite';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';
import {singleReference, soupyFind} from '#composite/wiki-properties';

import {SoundDetail} from './SoundDetail.js';

export class SampledTrackSoundDetail extends SoundDetail {
  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    sampledTrack: singleReference({
      find: soupyFind.input('track'),
    }),

    // Expose only

    kind: exposeConstant(V('sampled track')),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Sampled Track': {property: 'sampledTrack'},
    },
  };
}
