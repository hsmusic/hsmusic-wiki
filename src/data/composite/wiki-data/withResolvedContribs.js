// Resolves the contribsByRef contained in the provided dependency,
// providing (named by the second argument) the result. "Resolving"
// means mapping the artist reference of each contribution to an artist
// object, and filtering out those whose artist reference doesn't match
// any artist.

import {input, templateCompositeFrom} from '#composite';
import {filterMultipleArrays, stitchArrays} from '#sugar';
import thingConstructors from '#things';
import {isContributionList, isDate, isStringNonEmpty, isThingClass}
  from '#validators';

import {raiseOutputWithoutDependency, withAvailabilityFilter}
  from '#composite/control-flow';
import {withPropertyFromList, withPropertiesFromList} from '#composite/data';

import inputNotFoundMode from './inputNotFoundMode.js';
import raiseResolvedReferenceList from './raiseResolvedReferenceList.js';

export default templateCompositeFrom({
  annotation: `withResolvedContribs`,

  inputs: {
    from: input({
      validate: isContributionList,
      acceptsNull: true,
    }),

    class: input({
      validate: isThingClass,
      defaultValue: null,
    }),

    date: input({
      validate: isDate,
      acceptsNull: true,
      defaultDependency: 'date',
    }),

    notFoundMode: inputNotFoundMode(),

    thingProperty: input({
      validate: isStringNonEmpty,
      defaultValue: null,
    }),

    artistProperty: input({
      validate: isStringNonEmpty,
      defaultValue: null,
    }),
  },

  outputs: ['#resolvedContribs'],

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: input('from'),
      mode: input.value('empty'),
      output: input.value({
        ['#resolvedContribs']: [],
      }),
    }),

    {
      dependencies: [
        input('thingProperty'),
        input.staticDependency('from'),
      ],

      compute: (continuation, {
        [input('thingProperty')]: thingProperty,
        [input.staticDependency('from')]: fromDependency,
      }) => continuation({
        ['#thingProperty']:
          (thingProperty
            ? thingProperty
         : !fromDependency?.startsWith('#')
            ? fromDependency
            : null),
      }),
    },

    withPropertiesFromList({
      list: input('from'),
      properties: input.value(['artist', 'artistText', 'annotation']),
      prefix: input.value('#contribs'),
    }),

    {
      dependencies: [
        '#contribs.artist',
        '#contribs.artistText',
        '#contribs.annotation',
        input('date'),
      ],

      compute(continuation, {
        ['#contribs.artist']: artist,
        ['#contribs.artistText']: artistText,
        ['#contribs.annotation']: annotation,
        [input('date')]: date,
      }) {
        filterMultipleArrays(
          artist,
          artistText,
          annotation,
          (artist, _artistText, _annotation) => artist);

        return continuation({
          ['#details']:
            stitchArrays({artist, artistText, annotation})
              .map(details => ({
                ...details,
                date: date ?? null,
              })),
        });
      },
    },

    {
      dependencies: [input('class')],
      compute: (continuation, {
        [input('class')]: classInput,
      }) => continuation({
        ['#contributionConstructor']:
          classInput ??
          thingConstructors.Contribution,
      }),
    },

    {
      dependencies: [
        '#details',
        '#thingProperty',
        '#contributionConstructor',
        input('artistProperty'),
        input.myself(),
        '_find',
      ],

      compute: (continuation, {
        ['#details']: details,
        ['#thingProperty']: thingProperty,
        ['#contributionConstructor']: contributionConstructor,
        [input('artistProperty')]: artistProperty,
        [input.myself()]: myself,
        ['_find']: find,
      }) => continuation({
        ['#contributions']:
          details.map(details => {
            const contrib = Reflect.construct(contributionConstructor, []);

            Object.assign(contrib, {
              ...details,
              thing: myself,
              thingProperty: thingProperty,
              artistProperty: artistProperty,
              find: find,
            });

            return contrib;
          }),
      }),
    },

    withPropertyFromList({
      list: '#contributions',
      property: input.value('artist'),
    }),

    withAvailabilityFilter({
      from: '#contributions.artist',
    }),

    raiseResolvedReferenceList({
      notFoundMode: input('notFoundMode'),
      results: '#contributions',
      filter: '#availabilityFilter',
      outputs: input.value('#resolvedContribs'),
    }),
  ],
});
