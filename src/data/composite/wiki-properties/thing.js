// An individual Thing, provided directly rather than by reference.

import {input, templateCompositeFrom} from '#composite';
import {isThingClass, validateThing} from '#validators';

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
      validateThing({
        referenceType:
          (thingClass
            ? thingClass[Symbol.for('Thing.referenceType')]
            : ''),
      }),
  }),

  steps: () => [],
});
