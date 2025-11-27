// Provides a value inherited from the main release, or null,
// if this track is not a secondary release.

import {input, templateCompositeFrom} from '#composite';

import {withPropertyFromObject} from '#composite/data';

export default templateCompositeFrom({
  annotation: `withPropertyFromMainRelease`,

  inputs: {
    property: input({type: 'string'}),
  },

  outputs: ({
    [input.staticValue('property')]: property,
  }) => [
    (property
        ? '#mainRelease.' + property
        : '#mainReleaseValue'),
  ],

  steps: () => [
    {
      dependencies: ['isSecondaryRelease', input.staticValue('property')],
      compute: (continuation, {
        ['isSecondaryRelease']: isSecondaryRelease,
        [input.staticValue('property')]: property,
      }) =>
        (isSecondaryRelease
          ? continuation()
       : property
          ? continuation.raiseOutput({['#mainRelease.' + property]: null})
          : continuation.raiseOutput({'#mainReleaseValue': null})),
    },

    withPropertyFromObject({
      object: 'mainReleaseTrack',
      property: input('property'),
    }),

    {
      dependencies: ['#value', input.staticValue('property')],
      compute: (continuation, {
        ['#value']: value,
        [input.staticValue('property')]: property,
      }) =>
        (property
          ? continuation.raiseOutput({['#mainRelease.' + property]: value})
          : continuation.raiseOutput({'#mainReleaseValue': value})),
    },
  ],
});
