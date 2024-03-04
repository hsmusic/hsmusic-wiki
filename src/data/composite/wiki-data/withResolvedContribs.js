// Resolves the contribsByRef contained in the provided dependency,
// providing (named by the second argument) the result. "Resolving"
// means mapping the artist reference of each contribution to an artist
// object, and filtering out those whose artist reference doesn't match
// any artist.

import {input, templateCompositeFrom} from '#composite';
import find from '#find';
import {filterMultipleArrays, stitchArrays} from '#sugar';
import thingConstructors from '#things';
import {is, isContributionList} from '#validators';

import {raiseOutputWithoutDependency} from '#composite/control-flow';
import {withPropertiesFromList} from '#composite/data';

export default templateCompositeFrom({
  annotation: `withResolvedContribs`,

  inputs: {
    from: input({
      validate: isContributionList,
      acceptsNull: true,
    }),

    notFoundMode: input({
      validate: is('exit', 'filter', 'null'),
      defaultValue: 'null',
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

    withPropertiesFromList({
      list: input('from'),
      properties: input.value(['artist', 'annotation']),
      prefix: input.value('#contribs'),
    }),

    {
      dependencies: ['#contribs.artist', '#contribs.annotation'],

      compute(continuation, {
        ['#contribs.artist']: artist,
        ['#contribs.annotation']: annotation,
      }) {
        filterMultipleArrays(artist, annotation, (artist, _annotation) => artist);

        return continuation({
          ['#details']:
            stitchArrays({artist, annotation}),
        });
      },
    },

    {
      dependencies: ['#details', input.myself()],

      compute: (continuation, {
        ['#details']: details,
        [input.myself()]: myself,
      }) => continuation({
        ['#contributions']:
          details.map(details => {
            const contrib = new thingConstructors.Contribution();

            Object.assign(contrib, {
              ...details,
              thing: myself,
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
