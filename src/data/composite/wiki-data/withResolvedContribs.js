// Resolves the contribsByRef contained in the provided dependency,
// providing (named by the second argument) the result. "Resolving"
// means mapping the artist reference of each contribution to an artist
// object, and filtering out those whose artist reference doesn't match
// any artist.

import {input, templateCompositeFrom} from '#composite';
import {filterMultipleArrays, stitchArrays} from '#sugar';
import thingConstructors from '#things';
import {isContributionList, isDate, isStringNonEmpty} from '#validators';

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
      properties: input.value(['artist', 'annotation']),
      prefix: input.value('#contribs'),
    }),

    {
      dependencies: [
        '#contribs.artist',
        '#contribs.annotation',
        input('date'),
      ],

      compute(continuation, {
        ['#contribs.artist']: artist,
        ['#contribs.annotation']: annotation,
        [input('date')]: date,
      }) {
        filterMultipleArrays(artist, annotation, (artist, _annotation) => artist);

        return continuation({
          ['#details']:
            stitchArrays({artist, annotation})
              .map(details => ({
                ...details,
                date: date ?? null,
              })),
        });
      },
    },

    {
      dependencies: [
        '#details',
        '#thingProperty',
        input('artistProperty'),
        input.myself(),
        '_find',
      ],

      compute: (continuation, {
        ['#details']: details,
        ['#thingProperty']: thingProperty,
        [input('artistProperty')]: artistProperty,
        [input.myself()]: myself,
        ['_find']: find,
      }) => continuation({
        ['#contributions']:
          details.map(details => {
            const contrib = new thingConstructors.Contribution();

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
