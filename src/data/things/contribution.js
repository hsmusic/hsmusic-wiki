import {inspect} from 'node:util';

import CacheableObject from '#cacheable-object';
import {colors} from '#cli';
import {input} from '#composite';
import {empty} from '#sugar';
import Thing from '#thing';
import {isStringNonEmpty, isThing, validateReference} from '#validators';

import {exposeDependency} from '#composite/control-flow';
import {withResolvedReference} from '#composite/wiki-data';

import {
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
  });

  [inspect.custom](depth, options, inspect) {
    const parts = [];
    const accentParts = [];

    parts.push(Thing.prototype[inspect.custom].apply(this));

    if (this.annotation) {
      accentParts.push(colors.green(`"${this.annotation}"`));
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
