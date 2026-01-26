import {V} from '#composite';
import Thing from '#thing';
import {validateArrayItems, isString} from '#validators';

import {exposeConstant} from '#composite/control-flow';

import {HomepageLayoutRow} from './HomepageLayoutRow.js';

export class HomepageLayoutActionsRow extends HomepageLayoutRow {
  static [Thing.friendlyName] = `Homepage Actions Row`;

  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    actionLinks: {
      flags: {update: true, expose: true},
      update: {validate: validateArrayItems(isString)},
    },

    // Expose only

    isHomepageLayoutActionsRow: exposeConstant(V(true)),
    type: exposeConstant(V('actions')),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Actions': {property: 'actionLinks'},
    },
  };
}
