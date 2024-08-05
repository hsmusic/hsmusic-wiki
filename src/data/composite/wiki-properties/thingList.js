// A list of Things, provided directly rather than by reference.
//
// Essentially the same as wikiData, but exposes the list of things,
// instead of keeping it private.

import {input, templateCompositeFrom} from '#composite';
import {isThingClass, validateWikiData} from '#validators';

import {exposeConstant, exposeUpdateValueOrContinue}
  from '#composite/control-flow';

export default templateCompositeFrom({
  annotation: `wikiData`,

  compose: false,

  inputs: {
    class: input.staticValue({
      validate: isThingClass,
      defaultValue: null,
    }),
  },

  update: ({
    [input.staticValue('class')]: thingClass,
  }) => ({
    validate:
      validateWikiData({
        referenceType:
          (thingClass
            ? thingClass[Symbol.for('Thing.referenceType')]
            : ''),
      }),
  }),

  steps: () => [
    exposeUpdateValueOrContinue(),

    exposeConstant({
      value: input.value([]),
    }),
  ],
});

