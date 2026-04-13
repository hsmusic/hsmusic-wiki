import {inspect} from 'node:util';

import {colors} from '#cli';
import {input, V} from '#composite';
import {empty} from '#sugar';
import Thing from '#thing';
import {is, isCuratedURL, isDate, isStringNonEmpty, validateArrayItems}
  from '#validators';
import {parseContributors, parseDate} from '#yaml';

import {constituteFrom} from '#composite/wiki-data';

import {
  exposeConstant,
  exposeUpdateValueOrContinue,
  exposeWhetherDependencyAvailable,
} from '#composite/control-flow';

import {
  contributionList,
  dimensions,
  directory,
  fileExtension,
  soupyFind,
  soupyReverse,
  thing,
} from '#composite/wiki-properties';

export class MusicVideo extends Thing {
  static [Thing.referenceType] = 'music-video';
  static [Thing.friendlyName] = `Music Video`;
  static [Thing.wikiData] = 'musicVideoData';

  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    thing: thing(),

    title: {
      flags: {update: true, expose: true},
      update: {validate: isStringNonEmpty},
    },

    label: {
      flags: {update: true, expose: true},
      update: {validate: isStringNonEmpty},
    },

    unqualifiedDirectory: [
      {
        dependencies: ['title', 'label'],
        compute: (continuation, {title, label}) =>
          continuation({
            '#name': label ?? title ?? 'music video',
          }),
      },

      directory({name: '#name'}),
    ],

    date: [
      exposeUpdateValueOrContinue({
        validate: input.value(isDate),
      }),

      constituteFrom('thing', V('date')),
    ],

    url: {
      flags: {update: true, expose: true},

      update: {
        validate: isCuratedURL,
      },

      expose: {
        dependencies: ['_urls'],
        transform: (url, {'_urls': urls}) =>
          (url          ? url
         : !empty(urls) ? urls[0]
                        : null),
      },
    },

    urls: {
      flags: {update: true, expose: true},

      update: {
        validate: validateArrayItems(isCuratedURL),
      },

      expose: {
        dependencies: ['_url'],
        transform: (urls, {'_url': url}) =>
          (url && urls ? [url, ...urls]
         : url         ? [url]
         :        urls ? urls
                       : []),
      },
    },

    coverArtFileExtension: fileExtension(V('jpg')),
    coverArtDimensions: dimensions(),

    artistContribs: contributionList({
      artistProperty: input.value('musicVideoArtistContributions'),
    }),

    contributorStyle: [
      exposeUpdateValueOrContinue({
        validate: input.value(
          is('list', 'line')),
      }),

      {
        dependencies: ['contributorContribs'],
        compute: ({contributorContribs}) =>
          (contributorContribs.length > 1
            ? 'list'
            : 'line'),
      },
    ],

    contributorContribs: contributionList({
      artistProperty: input.value('musicVideoContributorContributions'),
    }),

    // Update only

    find: soupyFind(),

    // Expose only

    isMusicVideo: exposeConstant(V(true)),

    dateIsSpecified: exposeWhetherDependencyAvailable('_date'),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Title': {property: 'title'},
      'Label': {property: 'label'},
      'Directory': {property: 'unqualifiedDirectory'},
      'Date': {property: 'date', transform: parseDate},
      'URL': {property: 'url'},
      'URLs': {property: 'urls'},

      'Cover Art File Extension': {property: 'coverArtFileExtension'},
      'Cover Art Dimensions': {property: 'coverArtDimensions'},

      'Artists': {property: 'artistContribs', transform: parseContributors},
      'Contributor Style': {property: 'contributorStyle'},
      'Contributors': {property: 'contributorContribs', transform: parseContributors},
    },

    invalidFieldCombinations: [
      {message: `Specify all URLs on "URLs" field, if specifying multiple`, fields: [
        'URL',
        'URLs',
      ]},
    ],
  };

  static [Thing.reverseSpecs] = {
    musicVideoArtistContributionsBy:
      soupyReverse.contributionsBy('musicVideoData', 'artistContribs'),

    musicVideoContributorContributionsBy:
      soupyReverse.contributionsBy('musicVideoData', 'contributorContribs'),
  };

  get path() {
    if (!this.thing) return null;
    if (!this.thing.getOwnMusicVideoCoverPath) return null;

    return this.thing.getOwnMusicVideoCoverPath(this);
  }

  [inspect.custom](depth, options, inspect) {
    const parts = [];

    parts.push(Thing.prototype[inspect.custom].apply(this));

    if (this.thing) {
      if (depth >= 0) {
        const newOptions = {
          ...options,
          depth:
            (options.depth === null
              ? null
              : options.depth - 1),
        };

        parts.push(` for ${inspect(this.thing, newOptions)}`);
      } else {
        parts.push(` for ${colors.blue(Thing.inspectReference(this.thing))}`);
      }
    }

    return parts.join('');
  }
}
