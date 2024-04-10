import {inspect} from 'node:util';

import CacheableObject from '#cacheable-object';
import {colors} from '#cli';
import {input} from '#composite';
import {empty} from '#sugar';
import Thing from '#thing';
import {isStringNonEmpty, isThing, validateReference} from '#validators';

import {exitWithoutDependency, exposeDependency} from '#composite/control-flow';
import {withPropertyFromObject} from '#composite/data';
import {withResolvedReference} from '#composite/wiki-data';
import {flag, simpleDate} from '#composite/wiki-properties';

import {
  inheritFromContributionPresets,
  thingPropertyMatches,
  thingReferenceTypeMatches,
  withContributionArtist,
  withContributionContext,
  withMatchingContributionPresets,
} from '#composite/things/contribution';

export class Contribution extends Thing {
  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    thing: {
      flags: {update: true, expose: true},
      update: {validate: isThing},
    },

    thingProperty: {
      flags: {update: true, expose: true},
      update: {validate: isStringNonEmpty},
    },

    date: simpleDate(),

    artist: [
      withContributionArtist({
        ref: input.updateValue({
          validate: validateReference('artist'),
        }),
      }),

      exposeDependency({
        dependency: '#artist',
      }),
    ],

    annotation: {
      flags: {update: true, expose: true},
      update: {validate: isStringNonEmpty},
    },

    countInContributionTotals: [
      inheritFromContributionPresets({
        property: input.thisProperty(),
      }),

      flag(true),
    ],

    countInDurationTotals: [
      inheritFromContributionPresets({
        property: input.thisProperty(),
      }),

      flag(true),
    ],

    // Expose only

    context: [
      withContributionContext(),

      {
        dependencies: [
          '#contributionTarget',
          '#contributionProperty',
        ],

        compute: ({
          ['#contributionTarget']: target,
          ['#contributionProperty']: property,
        }) => ({
          target,
          property,
        }),
      },
    ],

    matchingPresets: [
      withMatchingContributionPresets(),

      exposeDependency({
        dependency: '#matchingContributionPresets',
      }),
    ],

    // All the contributions from the list which includes this contribution.
    // Note that this list contains not only other contributions by the same
    // artist, but also this very contribution. It doesn't mix contributions
    // exposed on different properties.
    associatedContributions: [
      exitWithoutDependency({
        dependency: 'thing',
        value: input.value([]),
      }),

      exitWithoutDependency({
        dependency: 'thingProperty',
        value: input.value([]),
      }),

      withPropertyFromObject({
        object: 'thing',
        property: 'thingProperty',
      }),

      exposeDependency({
        dependency: '#value',
      }),
    ],

    isArtistContribution: thingPropertyMatches({
      value: input.value('artistContribs'),
    }),

    isContributorContribution: thingPropertyMatches({
      value: input.value('contributorContribs'),
    }),

    isCoverArtistContribution: thingPropertyMatches({
      value: input.value('coverArtistContribs'),
    }),

    isBannerArtistContribution: thingPropertyMatches({
      value: input.value('bannerArtistContribs'),
    }),

    isWallpaperArtistContribution: thingPropertyMatches({
      value: input.value('wallpaperArtistContribs'),
    }),

    isForTrack: thingReferenceTypeMatches({
      value: input.value('track'),
    }),

    isForAlbum: thingReferenceTypeMatches({
      value: input.value('album'),
    }),

    isForFlash: thingReferenceTypeMatches({
      value: input.value('flash'),
    }),
  });

  [inspect.custom](depth, options, inspect) {
    const parts = [];
    const accentParts = [];

    parts.push(Thing.prototype[inspect.custom].apply(this));

    if (this.annotation) {
      accentParts.push(colors.green(`"${this.annotation}"`));
    }

    if (this.date) {
      accentParts.push(colors.yellow(this.date.toLocaleDateString()));
    }

    let artistRef;
    if (depth >= 0) {
      let artist;
      try {
        artist = this.artist;
      } catch (_error) {
        // Computing artist might crash for any reason - don't distract from
        // other errors as a result of inspecting this contribution.
      }

      if (artist) {
        artistRef =
          colors.blue(Thing.getReference(artist));
      }
    } else {
      artistRef =
        colors.green(CacheableObject.getUpdateValue(this, 'artist'));
    }

    if (artistRef) {
      accentParts.push(`by ${artistRef}`);
    }

    if (this.thing) {
      if (depth >= 0) {
        const newOptions = {
          ...options,
          depth:
            (options.depth === null
              ? null
              : options.depth - 1),
        };

        accentParts.push(`to ${inspect(this.thing, newOptions)}`);
      } else {
        accentParts.push(`to ${colors.blue(Thing.getReference(this.thing))}`);
      }
    }

    if (!empty(accentParts)) {
      parts.push(` (${accentParts.join(', ')})`);
    }

    return parts.join('');
  }
}
