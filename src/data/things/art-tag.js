export const ART_TAG_DATA_FILE = 'tags.yaml';

import {input} from '#composite';
import find from '#find';
import {sortAlphabetically, sortAlbumsTracksChronologically} from '#sort';
import Thing from '#thing';
import {isName} from '#validators';

import {exposeUpdateValueOrContinue} from '#composite/control-flow';

import {
  color,
  directory,
  flag,
  referenceList,
  reverseReferenceList,
  name,
  wikiData,
} from '#composite/wiki-properties';

export class ArtTag extends Thing {
  static [Thing.referenceType] = 'tag';
  static [Thing.friendlyName] = `Art Tag`;

  static [Thing.getPropertyDescriptors] = ({Album, Track}) => ({
    // Update & expose

    name: name('Unnamed Art Tag'),
    directory: directory(),
    color: color(),
    isContentWarning: flag(false),

    nameShort: [
      exposeUpdateValueOrContinue({
        validate: input.value(isName),
      }),

      {
        dependencies: ['name'],
        compute: ({name}) =>
          name.replace(/ \([^)]*?\)$/, ''),
      },
    ],

    directDescendantTags: referenceList({
      class: input.value(ArtTag),
      find: input.value(find.artTag),
      data: 'artTagData',
    }),

    // Update only

    albumData: wikiData({
      class: input.value(Album),
    }),

    artTagData: wikiData({
      class: input.value(ArtTag),
    }),

    trackData: wikiData({
      class: input.value(Track),
    }),

    // Expose only

    taggedInThings: {
      flags: {expose: true},

      expose: {
        dependencies: ['this', 'albumData', 'trackData'],
        compute: ({this: artTag, albumData, trackData}) =>
          sortAlbumsTracksChronologically(
            [...albumData, ...trackData]
              .filter(({artTags}) => artTags.includes(artTag)),
            {getDate: thing => thing.coverArtDate ?? thing.date}),
      },
    },

    directAncestorTags: reverseReferenceList({
      data: 'artTagData',
      list: input.value('directDescendantTags'),
    }),
  });

  static [Thing.findSpecs] = {
    artTag: {
      referenceTypes: ['tag'],
      bindTo: 'artTagData',

      getMatchableNames: tag =>
        (tag.isContentWarning
          ? [`cw: ${tag.name}`]
          : [tag.name]),
    },
  };

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Tag': {property: 'name'},
      'Short Name': {property: 'nameShort'},
      'Directory': {property: 'directory'},

      'Color': {property: 'color'},
      'Is CW': {property: 'isContentWarning'},

      'Direct Descendant Tags': {property: 'directDescendantTags'},
    },
  };

  static [Thing.getYamlLoadingSpec] = ({
    documentModes: {allInOne},
    thingConstructors: {ArtTag},
  }) => ({
    title: `Process art tags file`,
    file: ART_TAG_DATA_FILE,

    documentMode: allInOne,
    documentThing: ArtTag,

    save: (results) => ({artTagData: results}),

    sort({artTagData}) {
      sortAlphabetically(artTagData);
    },
  });
}
