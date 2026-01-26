import {V} from '#composite';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';

import {ContentEntry} from './ContentEntry.js';

export class ReferencingSourcesEntry extends ContentEntry {
  static [Thing.wikiData] = 'referencingSourceData';

  static [Thing.getPropertyDescriptors] = () => ({
    // Expose only

    isReferencingSourceEntry: exposeConstant(V(true)),
  });
}
