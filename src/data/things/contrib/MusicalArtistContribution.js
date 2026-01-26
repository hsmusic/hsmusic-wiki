import {V} from '#composite';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';

import {Contribution} from './Contribution.js';

export class MusicalArtistContribution extends Contribution {
  static [Thing.getPropertyDescriptors] = () => ({
    isMusicalArtistContribution: exposeConstant(V(true)),
  });
}
