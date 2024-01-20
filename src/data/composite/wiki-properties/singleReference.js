// Stores and exposes one connection, or reference, to another data object.
// The reference must be to a specific type, which is specified on the class
// input.
//
// See also:
//  - referenceList
//  - withResolvedReference
//

import {input, templateCompositeFrom} from '#composite';
import {isThingClass, validateReference} from '#validators';

import {exposeDependency} from '#composite/control-flow';
import {inputWikiData, withResolvedReference} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `singleReference`,

  compose: false,

  inputs: {
    class: input.staticValue({validate: isThingClass}),

    find: input({type: 'function'}),

    data: inputWikiData({allowMixedTypes: false}),
  },

  update: ({
    [input.staticValue('class')]: thingClass,
  }) => ({
    validate:
      validateReference(
        thingClass[Symbol.for('Thing.referenceType')]),
  }),

  steps: () => [
    withResolvedReference({
      ref: input.updateValue(),
      data: input('data'),
      find: input('find'),
    }),

    exposeDependency({dependency: '#resolvedReference'}),
  ],
});
