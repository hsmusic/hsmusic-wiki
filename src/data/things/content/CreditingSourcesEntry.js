import {V} from '#composite';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';

import {ContentEntry} from './ContentEntry.js';

export class CreditingSourcesEntry extends ContentEntry {
  static [Thing.friendlyName] = `Crediting Sources Entry`;
  static [Thing.wikiData] = 'creditingSourceData';

  static [Thing.getPropertyDescriptors] = () => ({
    // Expose only

    isCreditingSourcesEntry: exposeConstant(V(true)),
  });
}
