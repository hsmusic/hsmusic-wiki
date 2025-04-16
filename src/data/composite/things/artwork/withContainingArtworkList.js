// Gets the list of artworks which contains this one, which is functionally
// equivalent to `this.thing[this.thingProperty]`. If the exposed value is not
// a list at all (i.e. the property holds a single artwork), this composition
// outputs null.

import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency} from '#composite/control-flow';
import {withPropertyFromObject} from '#composite/data';

export default templateCompositeFrom({
  annotation: `withContainingArtworkList`,

  outputs: ['#containingArtworkList'],

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: 'thing',
      output: input.value({'#containingArtworkList': null}),
    }),

    raiseOutputWithoutDependency({
      dependency: 'thingProperty',
      output: input.value({'#containingArtworkList': null}),
    }),

    withPropertyFromObject({
      object: 'thing',
      property: 'thingProperty',
    }).outputs({
      '#value': '#containingValue',
    }),

    {
      dependencies: ['#containingValue'],
      compute: (continuation, {
        ['#containingValue']: containingValue,
      }) => continuation({
        ['#containingArtworkList']:
          (Array.isArray(containingValue)
            ? containingValue
            : null),
      }),
    },
  ],
});
