import {inspect} from 'node:util';

import {colors} from '#cli';
import {input, V} from '#composite';
import find from '#find';
import Thing from '#thing';
import {isDate, isStringNonEmpty, isURL} from '#validators';
import {parseContributors, parseDate} from '#yaml';

import {exposeConstant, exposeUpdateValueOrContinue}
  from '#composite/control-flow';
import {constituteFrom} from '#composite/wiki-data';

import {
  contributionList,
  dimensions,
  directory,
  fileExtension,
  soupyFind,
  soupyReverse,
  thing,
  urls,
} from '#composite/wiki-properties';

export class MusicVideo extends Thing {
  static [Thing.referenceType] = 'music-video';
  static [Thing.wikiData] = 'musicVideoData';

  static [Thing.getPropertyDescriptors] = ({ArtTag}) => ({
    // Update & expose

    thing: thing(),

    label: {
      flags: {update: true, expose: true},
      update: {validate: isStringNonEmpty},
      expose: {transform: value => value ?? 'Music video'},
    },

    unqualifiedDirectory: directory({name: 'label'}),

    date: [
      exposeUpdateValueOrContinue({
        validate: input.value(isDate),
      }),

      constituteFrom('thing', V('date')),
    ],

    url: {
      flags: {update: true, expose: true},
      update: {validate: isURL},
    },

    coverArtFileExtension: fileExtension(V('jpg')),
    coverArtDimensions: dimensions(),

    artistContribs: contributionList({
      artistProperty: input.value('musicVideoArtistContributions'),
    }),

    contributorContribs: contributionList({
      artistProperty: input.value('musicVideoContributorContributions'),
    }),

    // Update only

    find: soupyFind(),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Label': {property: 'label'},
      'Directory': {property: 'unqualifiedDirectory'},
      'Date': {property: 'date', transform: parseDate},
      'URL': {property: 'url'},

      'Cover Art File Extension': {property: 'coverArtFileExtension'},
      'Cover Art Dimensions': {property: 'coverArtDimensions'},

      'Artists': {property: 'artistContribs', transform: parseContributors},
      'Contributors': {property: 'contributorContribs', transform: parseContributors},
    },
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
        parts.push(` for ${colors.blue(Thing.getReference(this.thing))}`);
      }
    }

    return parts.join('');
  }
}
