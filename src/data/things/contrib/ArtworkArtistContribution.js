import {V} from '#composite';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';

import {Contribution} from './Contribution.js';

export class ArtworkArtistContribution extends Contribution {
  static [Thing.getPropertyDescriptors] = () => ({
    isArtworkArtistContribution: exposeConstant(V(true)),
  });
}
