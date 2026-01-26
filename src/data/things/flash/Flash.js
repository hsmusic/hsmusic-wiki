import {input, V} from '#composite';
import Thing from '#thing';
import {anyOf, isColor, isDirectory, isNumber, isString}
  from '#validators';

import {
  parseArtwork,
  parseAdditionalNames,
  parseCommentary,
  parseContributors,
  parseCreditingSources,
  parseDate,
  parseDimensions,
} from '#yaml';

import {withPropertyFromObject} from '#composite/data';

import {
  exposeConstant,
  exposeDependency,
  exposeUpdateValueOrContinue,
} from '#composite/control-flow';

import {
  commentatorArtists,
  constitutibleArtwork,
  contributionList,
  dimensions,
  fileExtension,
  name,
  referenceList,
  simpleDate,
  soupyFind,
  soupyReverse,
  thing,
  thingList,
  urls,
} from '#composite/wiki-properties';

export class Flash extends Thing {
  static [Thing.referenceType] = 'flash';
  static [Thing.wikiData] = 'flashData';

  static [Thing.constitutibleProperties] = [
    'coverArtwork', // from inline fields
  ];

  static [Thing.getPropertyDescriptors] = ({
    AdditionalName,
    CommentaryEntry,
    CreditingSourcesEntry,
    FlashAct,
    Track,
    WikiInfo,
  }) => ({
    // Update & expose

    act: thing(V(FlashAct)),

    name: name(V('Unnamed Flash')),

    directory: {
      flags: {update: true, expose: true},
      update: {validate: isDirectory},

      // Flashes expose directory differently from other Things! Their
      // default directory is dependent on the page number (or ID), not
      // the name.
      expose: {
        dependencies: ['page'],
        transform(directory, {page}) {
          if (directory === null && page === null) return null;
          else if (directory === null) return page;
          else return directory;
        },
      },
    },

    page: {
      flags: {update: true, expose: true},
      update: {validate: anyOf(isString, isNumber)},

      expose: {
        transform: (value) => (value === null ? null : value.toString()),
      },
    },

    color: [
      exposeUpdateValueOrContinue({
        validate: input.value(isColor),
      }),

      withPropertyFromObject('act', V('color')),
      exposeDependency('#act.color'),
    ],

    date: simpleDate(),

    coverArtFileExtension: fileExtension(V('jpg')),

    coverArtDimensions: dimensions(),

    coverArtwork:
      constitutibleArtwork.fromYAMLFieldSpec
        .call(this, 'Cover Artwork'),

    contributorContribs: contributionList({
      artistProperty: input.value('flashContributorContributions'),
    }),

    featuredTracks: referenceList({
      class: input.value(Track),
      find: soupyFind.input('track'),
    }),

    urls: urls(),

    additionalNames: thingList(V(AdditionalName)),

    commentary: thingList(V(CommentaryEntry)),
    creditingSources: thingList(V(CreditingSourcesEntry)),

    // Update only

    find: soupyFind(),
    reverse: soupyReverse(),

    // used for withMatchingContributionPresets (indirectly by Contribution)
    wikiInfo: thing(V(WikiInfo)),

    // Expose only

    isFlash: exposeConstant(V(true)),

    commentatorArtists: commentatorArtists(),

    side: [
      withPropertyFromObject('act', V('side')),
      exposeDependency('#act.side'),
    ],
  });

  static [Thing.getSerializeDescriptors] = ({
    serialize: S,
  }) => ({
    name: S.id,
    page: S.id,
    directory: S.id,
    date: S.id,
    contributors: S.toContribRefs,
    tracks: S.toRefs,
    urls: S.id,
    color: S.id,
  });

  static [Thing.findSpecs] = {
    flash: {
      referenceTypes: ['flash'],
      bindTo: 'flashData',
    },
  };

  static [Thing.reverseSpecs] = {
    flashesWhichFeature: {
      bindTo: 'flashData',

      referencing: flash => [flash],
      referenced: flash => flash.featuredTracks,
    },

    flashContributorContributionsBy:
      soupyReverse.contributionsBy('flashData', 'contributorContribs'),

    flashesWithCommentaryBy: {
      bindTo: 'flashData',

      referencing: flash => [flash],
      referenced: flash => flash.commentatorArtists,
    },
  };

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Flash': {property: 'name'},
      'Directory': {property: 'directory'},
      'Page': {property: 'page'},
      'Color': {property: 'color'},
      'URLs': {property: 'urls'},

      'Date': {
        property: 'date',
        transform: parseDate,
      },

      'Additional Names': {
        property: 'additionalNames',
        transform: parseAdditionalNames,
      },

      'Cover Artwork': {
        property: 'coverArtwork',
        transform:
          parseArtwork({
            single: true,
            thingProperty: 'coverArtwork',
            fileExtensionFromThingProperty: 'coverArtFileExtension',
            dimensionsFromThingProperty: 'coverArtDimensions',
          }),
      },

      'Cover Art File Extension': {property: 'coverArtFileExtension'},

      'Cover Art Dimensions': {
        property: 'coverArtDimensions',
        transform: parseDimensions,
      },

      'Featured Tracks': {property: 'featuredTracks'},

      'Contributors': {
        property: 'contributorContribs',
        transform: parseContributors,
      },

      'Commentary': {
        property: 'commentary',
        transform: parseCommentary,
      },

      'Crediting Sources': {
        property: 'creditingSources',
        transform: parseCreditingSources,
      },

      'Review Points': {ignore: true},
    },
  };

  getOwnArtworkPath(artwork) {
    return [
      'media.flashArt',
      this.directory,
      artwork.fileExtension,
    ];
  }
}
