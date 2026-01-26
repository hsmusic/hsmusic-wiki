import {V} from '#composite';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';

import {MusicalArtistContribution} from './MusicalArtistContribution.js';

export class AlbumArtistContribution extends MusicalArtistContribution {
  static [Thing.getPropertyDescriptors] = () => ({
    isAlbumArtistContribution: exposeConstant(V(true)),
  });
}
