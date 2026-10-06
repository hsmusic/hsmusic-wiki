import {input, V} from '#composite';
import Thing from '#thing';
import {isBoolean} from '#validators';

import {exposeConstant, exposeUpdateValueOrContinue}
  from '#composite/control-flow';
import {thing} from '#composite/wiki-properties';

import {TrackSection} from './TrackSection.js';

export class AsideTrackSection extends TrackSection {
  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    stem: thing(V(TrackSection)),

    hideDuration: [
      exposeUpdateValueOrContinue({
        validate: input.value(isBoolean),
      }),

      exposeConstant(V(true)),
    ],

    // Expose only

    isAsideTrackSection:
      exposeConstant(V(true)),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Aside Section': {property: 'name'},
    },
  };
}
