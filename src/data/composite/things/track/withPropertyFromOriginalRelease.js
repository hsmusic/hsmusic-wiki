// Provides a value inherited from the original release, if applicable, and a
// flag indicating if this track is a rerelase or not.
//
// Like withOriginalRelease, this will early exit (with notFoundValue) if the
// original release is specified by reference and that reference doesn't
// resolve to anything.

import {input, templateCompositeFrom} from '#composite';

import {withResultOfAvailabilityCheck} from '#composite/control-flow';
import {withPropertyFromObject} from '#composite/data';

import withOriginalRelease from './withOriginalRelease.js';

export default templateCompositeFrom({
  annotation: `inheritFromOriginalRelease`,

  inputs: {
    property: input({type: 'string'}),

    notFoundValue: input({
      defaultValue: null,
    }),
  },

  outputs: ({
    [input.staticValue('property')]: property,
  }) =>
    ['#isRerelease'].concat(
      (property
        ? ['#original.' + property]
        : ['#originalValue'])),

  steps: () => [
    withOriginalRelease({
      notFoundValue: input('notFoundValue'),
    }),

    withResultOfAvailabilityCheck({
      from: '#originalRelease',
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
                {'#isRerelease': false},
                (property
                  ? {['#original.' + property]: null}
                  : {'#originalValue': null})))),
    },

    withPropertyFromObject({
      object: '#originalRelease',
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
            {'#isRerelease': true},
            (property
              ? {['#original.' + property]: value}
              : {'#originalValue': value}))),
    },
  ],
});
