// Provides a value inherited from the main release, if applicable, and a
// flag indicating if this track is a secondary release or not.
//
// Like withMainRelease, this will early exit (with notFoundValue) if the
// main release is specified by reference and that reference doesn't
// resolve to anything.

import {input, templateCompositeFrom} from '#composite';

import {withResultOfAvailabilityCheck} from '#composite/control-flow';
import {withPropertyFromObject} from '#composite/data';

import withMainReleaseTrack from './withMainReleaseTrack.js';

export default templateCompositeFrom({
  annotation: `inheritFromMainRelease`,

  inputs: {
    property: input({type: 'string'}),

    notFoundValue: input({
      defaultValue: null,
    }),
  },

  outputs: ({
    [input.staticValue('property')]: property,
  }) =>
    ['#isSecondaryRelease'].concat(
      (property
        ? ['#mainRelease.' + property]
        : ['#mainReleaseValue'])),

  steps: () => [
    withMainReleaseTrack({
      notFoundValue: input('notFoundValue'),
    }),

    withResultOfAvailabilityCheck({
      from: '#mainReleaseTrack',
    }),

    {
      dependencies: [
        '#availability',
        input.staticValue('property'),
      ],

      compute: (continuation, {
        ['#availability']: availability,
        [input.staticValue('property')]: property,
      }) =>
        (availability
          ? continuation()
          : continuation.raiseOutput(
              Object.assign(
                {'#isSecondaryRelease': false},
                (property
                  ? {['#mainRelease.' + property]: null}
                  : {'#mainReleaseValue': null})))),
    },

    withPropertyFromObject({
      object: '#mainReleaseTrack',
      property: input('property'),
    }),

    {
      dependencies: [
        '#value',
        input.staticValue('property'),
      ],

      compute: (continuation, {
        ['#value']: value,
        [input.staticValue('property')]: property,
      }) =>
        continuation.raiseOutput(
          Object.assign(
            {'#isSecondaryRelease': true},
            (property
              ? {['#mainRelease.' + property]: value}
              : {'#mainReleaseValue': value}))),
    },
  ],
});
