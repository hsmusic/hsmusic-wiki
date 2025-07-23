export const DATA_MEDIA_DIRECTORY = 'media';
export const MEDIA_DATA_FILE = 'media.yaml';

import {readFile} from 'node:fs/promises';
import * as path from 'node:path';

import {input} from '#composite';
import {traverse} from '#node-utils';
import {sortAlphabetically} from '#sort';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';

import {
  directory,
  name,
  referenceList,
  reverseReferenceList,
  soupyFind,
  soupyReverse,
} from '#composite/wiki-properties';

export class Media extends Thing {
  static [Thing.referenceType] = 'media';
  static [Thing.friendlyName] = `Media`;

  static [Thing.getPropertyDescriptors] = ({Media}) => ({
    // > Update & expose - Identifying metadata

    name: name('Unnamed Media'),
    directory: directory(),

    // > Update & expose - Media relationships

    directDescendantMedia: referenceList({
      class: input.value(Media),
      find: soupyFind.input('media'),
    }),

    // > Update only

    find: soupyFind(),
    reverse: soupyReverse(),

    // > Expose only

    isMedia: [
      exposeConstant({
        value: input.value(true),
      }),
    ],

    directAncestorMedia: reverseReferenceList({
      reverse: soupyReverse.input('mediaWhichDirectlyAncestor'),
    }),
  });

  static [Thing.findSpecs] = {
    media: {
      referenceTypes: ['media'],
      bindTo: 'mediaData',
    },
  };

  static [Thing.reverseSpecs] = {
    mediaWhichDirectlyAncestor: {
      bindTo: 'mediaData',

      referencing: media => [media],
      referenced: media => media.directDescendantMedia,
    },
  };

  static [Thing.yamlDocumentSpec] = {
    fields: {
      // Identifying metadata

      'Media': {property: 'name'},
      'Directory': {property: 'directory'},

      // Media relationships

      'Direct Descendant Media': {property: 'directDescendantMedia'},
    },
  };

  static [Thing.getYamlLoadingSpec] = ({
    documentModes: {allTogether},
    thingConstructors: {Media},
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
    documentThing: Media,

    save: (results) => ({mediaData: results}),

    sort({mediaData}) {
      sortAlphabetically(mediaData);
    },
  });
}
