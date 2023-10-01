// Stores and exposes one connection, or reference, to another data object.
// The reference must be to a specific type, which is specified on the class
// input.
//
// See also:
//  - referenceList
//  - withResolvedReference
//

import {input, templateCompositeFrom} from '#composite';
import {validateReference} from '#validators';

import {exposeDependency} from '#composite/control-flow';
import {inputThingClass, inputWikiData, withResolvedReference}
  from '#composite/wiki-data';

// TODO: Kludge.
import Thing from '../../things/thing.js';

export default templateCompositeFrom({
  annotation: `singleReference`,

  compose: false,

  inputs: {
    class: inputThingClass(),
    find: input({type: 'function'}),
    data: inputWikiData({allowMixedTypes: false}),
  },

  update: ({
    [input.staticValue('class')]: thingClass,
  }) => {
    const {[Thing.referenceType]: referenceType} = thingClass;
    return {validate: validateReference(referenceType)};
  },

  steps: () => [
    withResolvedReference({
      ref: input.updateValue(),
      data: input('data'),
      find: input('find'),
    }),

    exposeDependency({dependency: '#resolvedReference'}),
  ],
});
