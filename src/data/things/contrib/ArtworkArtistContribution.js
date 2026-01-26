import {V} from '#composite';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';

import {hasAnnotationFront} from '#composite/things/contribution';

import {Contribution} from './Contribution.js';

export class ArtworkArtistContribution extends Contribution {
  static [Thing.getPropertyDescriptors] = () => ({
    isArtworkArtistContribution: exposeConstant(V(true)),

    recognizedAnnotationFronts:
      exposeConstant(V(['edits for wiki'])),

    isEditsForWikiCredit:
      hasAnnotationFront(V('edits for wiki')),
  });
}
