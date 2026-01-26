import {input, V} from '#composite';
import Thing from '#thing';

import {anyOf, is, isCountingNumber, validateReference} from '#validators';

import {exposeConstant, exposeDependency} from '#composite/control-flow';
import {withResolvedReference} from '#composite/wiki-data';
import {referenceList, soupyFind} from '#composite/wiki-properties';

import {HomepageLayoutRow} from './HomepageLayoutRow.js';

export class HomepageLayoutAlbumGridRow extends HomepageLayoutRow {
  static [Thing.friendlyName] = `Homepage Album Grid Row`;

  static [Thing.getPropertyDescriptors] = (opts, {Album, Group} = opts) => ({
    // Update & expose

    sourceGroup: [
      {
        flags: {expose: true, update: true, compose: true},

        update: {
          validate:
            anyOf(
              is('new-releases', 'new-additions'),
              validateReference(Group[Thing.referenceType])),
        },

        expose: {
          transform: (value, continuation) =>
            (value === 'new-releases' || value === 'new-additions'
              ? value
              : continuation(value)),
        },
      },

      withResolvedReference({
        ref: input.updateValue(),
        find: soupyFind.input('group'),
      }),

      exposeDependency('#resolvedReference'),
    ],

    sourceAlbums: referenceList({
      class: input.value(Album),
      find: soupyFind.input('album'),
    }),

    countAlbumsFromGroup: {
      flags: {update: true, expose: true},
      update: {validate: isCountingNumber},
    },

    // Expose only

    isHomepageLayoutAlbumGridRow: exposeConstant(V(true)),
    type: exposeConstant(V('album grid')),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Group': {property: 'sourceGroup'},
      'Count': {property: 'countAlbumsFromGroup'},
      'Albums': {property: 'sourceAlbums'},
    },
  };
}
