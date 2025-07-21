import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency, withResultOfAvailabilityCheck}
  from '#composite/control-flow';
import {withPropertyFromObject} from '#composite/data';
import {withResolvedReferenceList} from '#composite/wiki-data';
import {soupyFind} from '#composite/wiki-properties';

import withPropertyFromAttachedArtwork
  from './withPropertyFromAttachedArtwork.js';

export default templateCompositeFrom({
  annotation: `withArtTags`,

  inputs: {
    from: input({
      type: 'array',
      acceptsNull: true,
      defaultDependency: 'artTags',
    }),
  },

  outputs: ['#artTags'],

  steps: () => [
    withResolvedReferenceList({
      list: input('from'),
      find: soupyFind.input('artTag'),
    }),

    withResultOfAvailabilityCheck({
      from: '#resolvedReferenceList',
      mode: input.value('empty'),
    }),

    {
      dependencies: ['#availability', '#resolvedReferenceList'],
      compute: (continuation, {
        ['#availability']: availability,
        ['#resolvedReferenceList']: resolvedReferenceList,
      }) =>
        (availability
          ? continuation.raiseOutput({
              '#artTags': resolvedReferenceList,
            })
          : continuation()),
    },

    withPropertyFromAttachedArtwork({
      property: input.value('artTags'),
    }),

    withResultOfAvailabilityCheck({
      from: '#attachedArtwork.artTags',
      mode: input.value('empty'),
    }),

    {
      dependencies: ['#availability', '#attachedArtwork.artTags'],
      compute: (continuation, {
        ['#availability']: availability,
        ['#attachedArtwork.artTags']: attachedArtworkArtTags,
      }) =>
        (availability
          ? continuation.raiseOutput({
              '#artTags': attachedArtworkArtTags,
            })
          : continuation()),
    },

    raiseOutputWithoutDependency({
      dependency: 'artTagsFromThingProperty',
      output: input.value({'#artTags': []}),
    }),

    withPropertyFromObject({
      object: 'thing',
      property: 'artTagsFromThingProperty',
    }).outputs({
      ['#value']: '#thing.artTags',
    }),

    withResultOfAvailabilityCheck({
      from: '#thing.artTags',
      mode: input.value('empty'),
    }),

    {
      dependencies: ['#availability', '#thing.artTags'],
      compute: (continuation, {
        ['#availability']: availability,
        ['#thing.artTags']: thingArtTags,
      }) =>
        (availability
          ? continuation({'#artTags': thingArtTags})
          : continuation({'#artTags': []})),
    },
  ],
});
