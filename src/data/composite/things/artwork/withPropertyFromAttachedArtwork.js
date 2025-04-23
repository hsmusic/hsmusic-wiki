import {input, templateCompositeFrom} from '#composite';

import {withResultOfAvailabilityCheck} from '#composite/control-flow';
import {withPropertyFromObject} from '#composite/data';

import withAttachedArtwork from './withAttachedArtwork.js';

function getOutputName({
  [input.staticValue('property')]: property,
}) {
  if (property) {
    return `#attachedArtwork.${property}`;
  } else {
    return '#value';
  }
}

export default templateCompositeFrom({
  annotation: `withPropertyFromAttachedArtwork`,

  inputs: {
    property: input({type: 'string'}),
  },

  outputs: inputs => [getOutputName(inputs)],

  steps: () => [
    {
      dependencies: [input.staticValue('property')],
      compute: (continuation, inputs) =>
        continuation({'#output': getOutputName(inputs)}),
    },

    withAttachedArtwork(),

    withResultOfAvailabilityCheck({
      from: '#attachedArtwork',
    }),

    {
      dependencies: ['#availability', '#output'],
      compute: (continuation, {
        ['#availability']: availability,
        ['#output']: output,
      }) =>
        (availability
          ? continuation()
          : continuation.raiseOutput({[output]: null})),
    },

    withPropertyFromObject({
      object: '#attachedArtwork',
      property: input('property'),
    }),

    {
      dependencies: ['#value', '#output'],
      compute: (continuation, {
        ['#value']: value,
        ['#output']: output,
      }) =>
        continuation.raiseOutput({[output]: value}),
    },
  ],
});
