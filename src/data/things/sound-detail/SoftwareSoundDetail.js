import {V} from '#composite';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';
import {simpleString} from '#composite/wiki-properties';

import {SoundDetail} from './SoundDetail.js';

export class SoftwareSoundDetail extends SoundDetail {
  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    name: simpleString(),
    path: simpleString(),

    // Expose only

    kind: exposeConstant(V('software')),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Software': {property: 'name'},
      'Path': {property: 'path'},
    },
  };
}
