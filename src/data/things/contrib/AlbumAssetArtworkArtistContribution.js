import {V} from '#composite';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';

import {ArtworkArtistContribution} from './ArtworkArtistContribution.js';

export class AlbumAssetArtworkArtistContribution extends ArtworkArtistContribution {
  static [Thing.getPropertyDescriptors] = () => ({
    isAlbumAssetArtworkArtistContribution: exposeConstant(V(true)),
  });
}
