import {input, templateCompositeFrom} from '#composite';

import {withResultOfAvailabilityCheck} from '#composite/control-flow';
import {withPropertyFromObject} from '#composite/data';

import withContainingArtworkList from './withContainingArtworkList.js';

function getOutputName({
  [input.staticValue('property')]: property,
}) {
  if (property) {
    return `#mainArtwork.${property}`;
  } else {
    return '#value';
  }
}

export default templateCompositeFrom({
  annotation: `withPropertyFromMainArtwork`,

  inputs: {
    property: input({type: 'string'}),
    onlyIfAttached: input({type: 'boolean', defaultValue: false}),
  },

  outputs: inputs => [getOutputName(inputs)],

  steps: () => [
    {
      dependencies: [input.staticValue('property')],
      compute: (continuation, inputs) =>
        continuation({'#output': getOutputName(inputs)}),
    },

    {
      dependencies: [input('onlyIfAttached'), 'attachAbove', '#output'],
      compute: (continuation, {
        [input('onlyIfAttached')]: onlyIfAttached,
        ['attachAbove']: attachAbove,
        ['#output']: output,
      }) =>
        (onlyIfAttached && attachAbove
          ? continuation()
       : onlyIfAttached
          ? continuation.raiseOutput({[output]: null})
          : continuation()),
    },

    withContainingArtworkList(),

    withResultOfAvailabilityCheck({
      from: '#containingArtworkList',
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

    {
      dependencies: ['#containingArtworkList'],
      compute: (continuation, {
        ['#containingArtworkList']: list,
      }) =>
        continuation({'#mainArtwork': list[0]}),
    },

    {
      dependencies: [input.myself(), '#mainArtwork', '#output'],
      compute: (continuation, {
        [input.myself()]: myself,
        ['#mainArtwork']: mainArtwork,
        ['#output']: output,
      }) =>
        (myself === mainArtwork
          ? continuation.raiseOutput({[output]: null})
          : continuation()),
    },

    withPropertyFromObject({
      object: '#mainArtwork',
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
