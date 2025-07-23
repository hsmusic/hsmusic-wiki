export const DATA_MEDIA_DIRECTORY = 'media';
export const MEDIA_DATA_FILE = 'media.yaml';

import {readFile} from 'node:fs/promises';
import * as path from 'node:path';

import {input} from '#composite';
import {traverse} from '#node-utils';
import {sortAlphabetically} from '#sort';
import Thing from '#thing';
import {parseDate} from '#yaml';

import {exposeConstant} from '#composite/control-flow';

import {
  directory,
  name,
  referenceList,
  reverseReferenceList,
  simpleDate,
  soupyFind,
  soupyReverse,
} from '#composite/wiki-properties';

export class Medium extends Thing {
  static [Thing.referenceType] = 'medium';
  static [Thing.friendlyName] = `Medium`;

  static [Thing.getPropertyDescriptors] = ({Medium}) => ({
    // > Update & expose - Identifying metadata

    name: name('Unnamed Medium'),
    directory: directory(),

    date: simpleDate(),

    // > Update & expose - Medium relationships

    directDescendantMedia: referenceList({
      class: input.value(Medium),
      find: soupyFind.input('medium'),
    }),

    // > Update only

    find: soupyFind(),
    reverse: soupyReverse(),

    // > Expose only

    isMedium: [
      exposeConstant({
        value: input.value(true),
      }),
    ],

    directAncestorMedia: reverseReferenceList({
      reverse: soupyReverse.input('mediaWhichDirectlyAncestor'),
    }),

    representedByAlbums: reverseReferenceList({
      reverse: soupyReverse.input('albumsWhichRepresent'),
    }),

    representedByTracks: reverseReferenceList({
      reverse: soupyReverse.input('tracksWhichRepresent'),
    }),
  });

  static [Thing.findSpecs] = {
    medium: {
      referenceTypes: ['medium'],
      bindTo: 'mediumData',
    },
  };

  static [Thing.reverseSpecs] = {
    mediaWhichDirectlyAncestor: {
      bindTo: 'mediumData',

      referencing: medium => [medium],
      referenced: medium => medium.directDescendantMedia,
    },
  };

  static [Thing.yamlDocumentSpec] = {
    fields: {
      // Identifying metadata

      'Medium': {property: 'name'},
      'Directory': {property: 'directory'},

      'Date': {
        property: 'date',
        transform: parseDate,
      },

      // Medium relationships

      'Direct Descendant Media': {property: 'directDescendantMedia'},
    },
  };

  static [Thing.getYamlLoadingSpec] = ({
    documentModes: {allTogether},
    thingConstructors: {Medium},
  }) => ({
    title: `Process media list files`,

    files: dataPath =>
      Promise.allSettled([
        readFile(path.join(dataPath, MEDIA_DATA_FILE))
          .then(() => [MEDIA_DATA_FILE]),

        traverse(path.join(dataPath, DATA_MEDIA_DIRECTORY), {
          filterFile: name => path.extname(name) === '.yaml',
          prefixPath: DATA_MEDIA_DIRECTORY,
        }),
      ]).then(results => results
          .filter(({status}) => status === 'fulfilled')
          .flatMap(({value}) => value)),

    documentMode: allTogether,
    documentThing: Medium,

    save: (results) => ({mediumData: results}),

    sort({mediumData}) {
      sortAlphabetically(mediumData);
    },
  });
}
