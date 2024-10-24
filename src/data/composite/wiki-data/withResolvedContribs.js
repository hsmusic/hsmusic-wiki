// Resolves the contribsByRef contained in the provided dependency,
// providing (named by the second argument) the result. "Resolving"
// means mapping the artist reference of each contribution to an artist
// object, and filtering out those whose artist reference doesn't match
// any artist.

import {input, templateCompositeFrom} from '#composite';
import find from '#find';
import {filterMultipleArrays, stitchArrays} from '#sugar';
import thingConstructors from '#things';
import {is, isContributionList, isDate, isStringNonEmpty} from '#validators';

import {raiseOutputWithoutDependency} from '#composite/control-flow';
import {withPropertiesFromList} from '#composite/data';

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
    }),

    notFoundMode: input({
      validate: is('exit', 'filter', 'null'),
      defaultValue: 'null',
    }),

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
      ],

      compute: (continuation, {
        ['#details']: details,
        ['#thingProperty']: thingProperty,
        [input('artistProperty')]: artistProperty,
        [input.myself()]: myself,
      }) => continuation({
        ['#contributions']:
          details.map(details => {
            const contrib = new thingConstructors.Contribution();

            Object.assign(contrib, {
              ...details,
              thing: myself,
              thingProperty: thingProperty,
              artistProperty: artistProperty,
            });

            return contrib;
          }),
      }),
    },

    {
      dependencies: ['#contributions'],

      compute: (continuation, {
        ['#contributions']: contributions,
      }) => continuation({
        ['#resolvedContribs']:
          contributions
            .filter(contrib => contrib.artist),
      }),
    },
  ],
});
