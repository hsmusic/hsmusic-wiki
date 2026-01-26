import {V} from '#composite';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';

import {hasAnnotationFront} from '#composite/things/contribution';

import {ArtworkArtistContribution} from './ArtworkArtistContribution.js';

export class AlbumAssetArtworkArtistContribution extends ArtworkArtistContribution {
  static [Thing.getPropertyDescriptors] = () => ({
    isAlbumAssetArtworkArtistContribution: exposeConstant(V(true)),

    recognizedAnnotationFronts:
      exposeConstant(V(['edits for wiki'])),

    isEditsForWikiCredit:
      hasAnnotationFront(V('edits for wiki')),
  });
}
