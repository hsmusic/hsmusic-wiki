import {inspect} from 'node:util';

import CacheableObject from '#cacheable-object';
import {colors} from '#cli';
import {input} from '#composite';
import {empty} from '#sugar';
import Thing from '#thing';
import {isBoolean, isStringNonEmpty, isThing, validateReference}
  from '#validators';

import {simpleDate, soupyFind} from '#composite/wiki-properties';

import {
  exitWithoutDependency,
  exposeConstant,
  exposeDependency,
  exposeDependencyOrContinue,
  exposeUpdateValueOrContinue,
} from '#composite/control-flow';

import {
  withFilteredList,
  withNearbyItemFromList,
  withPropertyFromList,
  withPropertyFromObject,
} from '#composite/data';

import {
  inheritFromContributionPresets,
  withContainingReverseContributionList,
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

    artistProperty: {
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

      exposeUpdateValueOrContinue({
        validate: input.value(isBoolean),
      }),

      {
        dependencies: ['thing', input.myself()],
        compute: (continuation, {
          ['thing']: thing,
          [input.myself()]: contribution,
        }) =>
          (thing.countOwnContributionInContributionTotals?.(contribution)
            ? true
         : thing.countOwnContributionInContributionTotals
            ? false
            : continuation()),
      },

      exposeConstant({
        value: input.value(true),
      }),
    ],

    countInDurationTotals: [
      inheritFromContributionPresets({
        property: input.thisProperty(),
      }),

      exposeUpdateValueOrContinue({
        validate: input.value(isBoolean),
      }),

      withPropertyFromObject({
        object: 'thing',
        property: input.value('duration'),
      }),

      exitWithoutDependency({
        dependency: '#thing.duration',
        mode: input.value('falsy'),
        value: input.value(false),
      }),

      {
        dependencies: ['thing', input.myself()],
        compute: (continuation, {
          ['thing']: thing,
          [input.myself()]: contribution,
        }) =>
          (thing.countOwnContributionInDurationTotals?.(contribution)
            ? true
         : thing.countOwnContributionInDurationTotals
            ? false
            : continuation()),
      },

      exposeConstant({
        value: input.value(true),
      }),
    ],

    // Update only

    find: soupyFind(),

    // Expose only

    isContribution: [
      exposeConstant({
        value: input.value(true),
      }),
    ],

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
      }).outputs({
        '#value': '#contributions',
      }),

      withPropertyFromList({
        list: '#contributions',
        property: input.value('annotation'),
      }),

      {
        dependencies: ['#contributions.annotation', 'annotation'],
        compute: (continuation, {
          ['#contributions.annotation']: contributionAnnotations,
          ['annotation']: annotation,
        }) => continuation({
          ['#likeContributionsFilter']:
            contributionAnnotations.map(mappingAnnotation =>
              (annotation?.startsWith(`edits for wiki`)
                ? mappingAnnotation?.startsWith(`edits for wiki`)
                : !mappingAnnotation?.startsWith(`edits for wiki`))),
        }),
      },

      withFilteredList({
        list: '#contributions',
        filter: '#likeContributionsFilter',
      }).outputs({
        '#filteredList': '#contributions',
      }),

      exposeDependency({
        dependency: '#contributions',
      }),
    ],

    previousBySameArtist: [
      withContainingReverseContributionList().outputs({
        '#containingReverseContributionList': '#list',
      }),

      exitWithoutDependency({
        dependency: '#list',
      }),

      withNearbyItemFromList({
        list: '#list',
        item: input.myself(),
        offset: input.value(-1),
      }),

      exposeDependency({
        dependency: '#nearbyItem',
      }),
    ],

    nextBySameArtist: [
      withContainingReverseContributionList().outputs({
        '#containingReverseContributionList': '#list',
      }),

      exitWithoutDependency({
        dependency: '#list',
      }),

      withNearbyItemFromList({
        list: '#list',
        item: input.myself(),
        offset: input.value(+1),
      }),

      exposeDependency({
        dependency: '#nearbyItem',
      }),
    ],

    groups: [
      withPropertyFromObject({
        object: 'thing',
        property: input.value('groups'),
      }),

      exposeDependencyOrContinue({
        dependency: '#thing.groups',
      }),

      exposeConstant({
        value: input.value([]),
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

    if (this.date) {
      accentParts.push(colors.yellow(this.date.toLocaleDateString()));
    }

    let artistRef;
    if (depth >= 0) {
      let artist;
      try {
        artist = this.artist;
      } catch {
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
