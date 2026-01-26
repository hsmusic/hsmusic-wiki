import {V} from '#composite';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';

import {MusicalArtistContribution} from './MusicalArtistContribution.js';

export class TrackArtistContribution extends MusicalArtistContribution {
  static [Thing.getPropertyDescriptors] = () => ({
    isTrackArtistContribution: exposeConstant(V(true)),
  });
}
