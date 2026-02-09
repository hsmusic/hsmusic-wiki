import {V} from '#composite';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';

import {hasAnnotationPart} from '#composite/things/content';

import {ContentEntry} from './ContentEntry.js';

export class ReferencingSourcesEntry extends ContentEntry {
  static [Thing.friendlyName] = `Referencing Sources Entry`;
  static [Thing.wikiData] = 'referencingSourceData';

  static [Thing.getPropertyDescriptors] = () => ({
    // Expose only

    isReferencingSourceEntry: exposeConstant(V(true)),

    isWikiEditorSource: hasAnnotationPart(V('wiki editor')),
  });
}
