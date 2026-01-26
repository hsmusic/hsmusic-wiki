import {V} from '#composite';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';

import {hasAnnotationPart} from '#composite/things/content';

import {ContentEntry} from './ContentEntry.js';

export class CommentaryEntry extends ContentEntry {
  static [Thing.wikiData] = 'commentaryData';

  static [Thing.getPropertyDescriptors] = () => ({
    // Expose only

    isCommentaryEntry: exposeConstant(V(true)),

    isWikiEditorCommentary: hasAnnotationPart(V('wiki editor')),
  });
}
