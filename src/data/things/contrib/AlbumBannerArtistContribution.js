import {V} from '#composite';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';

import {AlbumAssetArtworkArtistContribution} from './AlbumAssetArtworkArtistContribution.js';

export class AlbumBannerArtistContribution extends AlbumAssetArtworkArtistContribution {
  static [Thing.getPropertyDescriptors] = () => ({
    isAlbumBannerArtistContribution: exposeConstant(V(true)),
  });
}
