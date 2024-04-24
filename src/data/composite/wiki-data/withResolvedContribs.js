// Resolves the contribsByRef contained in the provided dependency,
// providing (named by the second argument) the result. "Resolving"
// means mapping the artist reference of each contribution to an artist
// object, and filtering out those whose artist reference doesn't match
// any artist.

import {input, templateCompositeFrom} from '#composite';
import find from '#find';
import {filterMultipleArrays, stitchArrays} from '#sugar';
import {is, isContributionList} from '#validators';

import {
  raiseOutputWithoutDependency,
} from '#composite/control-flow';

import {
  withPropertiesFromList,
} from '#composite/data';

import withResolvedReferenceList from './withResolvedReferenceList.js';

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

    withResolvedReferenceList({
      list: '#contribs.artist',
      data: 'artistData',
      find: input.value(find.artist),
      notFoundMode: input('notFoundMode'),
    }).outputs({
      ['#resolvedReferenceList']: '#contribs.artist',
    }),

    {
      dependencies: ['#contribs.artist', '#contribs.annotation'],

      compute(continuation, {
        ['#contribs.artist']: artist,
        ['#contribs.annotation']: annotation,
      }) {
        filterMultipleArrays(artist, annotation, (artist, _annotation) => artist);
        return continuation({
          ['#resolvedContribs']:
            stitchArrays({artist, annotation}),
        });
      },
    },
  ],
});
