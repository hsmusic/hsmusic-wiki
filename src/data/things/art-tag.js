export const ART_TAG_DATA_FILE = 'tags.yaml';

import {input} from '#composite';
import {sortAlphabetically, sortAlbumsTracksChronologically} from '#sort';
import Thing from '#thing';
import {isName} from '#validators';
import {parseReviewPoints} from '#yaml';

import {exposeUpdateValueOrContinue} from '#composite/control-flow';

import {
  color,
  directory,
  flag,
  name,
  reviewPointList,
  wikiData,
} from '#composite/wiki-properties';

export class ArtTag extends Thing {
  static [Thing.referenceType] = 'tag';
  static [Thing.friendlyName] = `Art Tag`;

  static [Thing.getPropertyDescriptors] = ({Album, ArtTag, Track}) => ({
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

    reviewPoints: reviewPointList({
      class: input.value(ArtTag),
    }),

    // Update only

    albumData: wikiData({
      class: input.value(Album),
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

      'Review Points': {
        property: 'reviewPoints',
        transform: parseReviewPoints,
      },
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
