import {V} from '#composite';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';

import {AlbumAssetArtworkArtistContribution} from './AlbumAssetArtworkArtistContribution.js';

export class AlbumWallpaperArtistContribution extends AlbumAssetArtworkArtistContribution {
  static [Thing.getPropertyDescriptors] = () => ({
    isAlbumWallpaperArtistContribution: exposeConstant(V(true)),
  });
}
