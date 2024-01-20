// Stores and exposes a list of references to other data objects; all items
// must be references to the same type, which is specified on the class input.
//
// See also:
//  - singleReference
//  - withResolvedReferenceList
//

import {input, templateCompositeFrom} from '#composite';
import {isThingClass, validateReferenceList} from '#validators';

import {exposeDependency} from '#composite/control-flow';
import {inputWikiData, withResolvedReferenceList} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `referenceList`,

  compose: false,

  inputs: {
    class: input.staticValue({validate: isThingClass}),

    data: inputWikiData({allowMixedTypes: false}),

    find: input({type: 'function'}),
  },

  update: ({
    [input.staticValue('class')]: thingClass,
  }) => ({
    validate:
      validateReferenceList(
        thingClass[Symbol.for('Thing.referenceType')]),
  }),

  steps: () => [
    withResolvedReferenceList({
      list: input.updateValue(),
      data: input('data'),
      find: input('find'),
    }),

    exposeDependency({dependency: '#resolvedReferenceList'}),
  ],
});
