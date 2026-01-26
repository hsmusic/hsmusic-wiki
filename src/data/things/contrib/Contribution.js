import {inspect} from 'node:util';

import CacheableObject from '#cacheable-object';
import {colors} from '#cli';
import {input, V} from '#composite';
import {empty} from '#sugar';
import Thing from '#thing';
import {isBoolean, isStringNonEmpty, isThing} from '#validators';

import {simpleDate, singleReference, simpleString, soupyFind}
  from '#composite/wiki-properties';

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
  withContributionContext,
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

    artist: singleReference({
      find: soupyFind.input('artist'),
    }),

    artistText: simpleString(),

    annotation: {
      flags: {update: true, expose: true},
      update: {validate: isStringNonEmpty},
    },

    countInContributionTotals: [
      exposeUpdateValueOrContinue({
        validate: input.value(isBoolean),
      }),

      inheritFromContributionPresets(),

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

      exposeConstant(V(true)),
    ],

    countInDurationTotals: [
      exposeUpdateValueOrContinue({
        validate: input.value(isBoolean),
      }),

      inheritFromContributionPresets(),

      withPropertyFromObject('thing', V('duration')),
      exitWithoutDependency('#thing.duration', {
        value: input.value(false),
        mode: input.value('falsy'),
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

      exposeConstant(V(true)),
    ],

    // Update only

    find: soupyFind(),

    // Expose only

    isContribution: exposeConstant(V(true)),

    recognizedAnnotationFronts: exposeConstant(V([])),

    annotationFront: [
      exitWithoutDependency('annotation'),

      {
        dependencies: ['recognizedAnnotationFronts', 'annotation'],
        compute: ({recognizedAnnotationFronts, annotation}) =>
          recognizedAnnotationFronts
            .find(front =>
              annotation.startsWith(front) && (
                annotation === front ||
                annotation.at(front.length) === ':' ||
                annotation.at(front.length) === ','
              )) ?? null,
      },
    ],

    annotationBack: [
      exitWithoutDependency('annotation'),

      exitWithoutDependency({
        dependency: 'annotationFront',
        value: 'annotation',
      }),

      {
        dependencies: ['annotation', 'annotationFront'],
        compute: ({annotation, annotationFront}) =>
          annotation.slice(annotationFront.length + 1).trim()
            || null,
      },
    ],

    annotationParts: [
      exitWithoutDependency('annotationBack', V([])),

      {
        dependencies: ['annotationBack'],
        compute: ({annotationBack}) =>
          annotationBack
            .split(',')
            .map(part => part.trim()),
      },
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
      withPropertyFromObject('thing', {
        property: input.value('wikiInfo'),
        internal: input.value(true),
      }),

      exitWithoutDependency('#thing.wikiInfo', V([])),

      withPropertyFromObject('#thing.wikiInfo', V('contributionPresets'))
        .outputs({'#thing.wikiInfo.contributionPresets': '#contributionPresets'}),

      exitWithoutDependency('#contributionPresets', V([]), V('empty')),

      withContributionContext(),

      // TODO: implementing this with compositional filters would be fun
      {
        dependencies: [
          '#contributionPresets',
          '#contributionTarget',
          '#contributionProperty',
          'annotation',
        ],

        compute: ({
          ['#contributionPresets']: presets,
          ['#contributionTarget']: target,
          ['#contributionProperty']: property,
          ['annotation']: annotation,
        }) =>
          presets.filter(preset =>
            preset.context[0] === target &&
            preset.context.slice(1).includes(property) &&
            // For now, only match if the annotation is a complete match.
            // Partial matches (e.g. because the contribution includes "two"
            // annotations, separated by commas) don't count.
            preset.annotation === annotation),
      },
    ],

    // All the contributions from the list which includes this contribution.
    // Note that this list contains not only other contributions by the same
    // artist, but also this very contribution. It doesn't mix contributions
    // exposed on different properties.
    associatedContributions: [
      exitWithoutDependency('thing', V([])),
      exitWithoutDependency('thingProperty', V([])),

      withPropertyFromObject('thing', 'thingProperty')
        .outputs({'#value': '#contributions'}),

      withPropertyFromList('#contributions', V('annotation')),

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

      withFilteredList('#contributions', '#likeContributionsFilter')
        .outputs({'#filteredList': '#contributions'}),

      exposeDependency('#contributions'),
    ],

    previousBySameArtist: [
      withContainingReverseContributionList()
        .outputs({'#containingReverseContributionList': '#list'}),

      exitWithoutDependency('#list'),

      withNearbyItemFromList('#list', input.myself(), V(-1)),
      exposeDependency('#nearbyItem'),
    ],

    nextBySameArtist: [
      withContainingReverseContributionList()
        .outputs({'#containingReverseContributionList': '#list'}),

      exitWithoutDependency('#list'),

      withNearbyItemFromList('#list', input.myself(), V(+1)),
      exposeDependency('#nearbyItem'),
    ],

    groups: [
      withPropertyFromObject('thing', V('groups')),
      exposeDependencyOrContinue('#thing.groups'),

      exposeConstant(V([])),
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
