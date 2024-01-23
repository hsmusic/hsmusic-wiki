// Stores and exposes a list of references to other data objects; all items
// must be references to the same type, which is specified on the class input.
//
// Reference code for:
//  - (atomic) referenceList
//
// See also:
//  - singleReference
//  - withResolvedReferenceList
//

import {input, templateCompositeFrom} from '#composite';
import {validateReferenceList} from '#validators';

import {exposeDependency} from '#composite/control-flow';
import {inputThingClass, inputWikiData, withResolvedReferenceList}
  from '#composite/wiki-data';

// TODO: Kludge.
import Thing from '../../things/thing.js';

export const REFERENCE = templateCompositeFrom({
  annotation: `referenceList`,

  compose: false,

  inputs: {
    class: inputThingClass(),

    data: inputWikiData({allowMixedTypes: false}),
    find: input({type: 'function'}),
  },

  update: ({
    [input.staticValue('class')]: thingClass,
  }) => {
    const {[Thing.referenceType]: referenceType} = thingClass;
    return {validate: validateReferenceList(referenceType)};
  },

  steps: () => [
    withResolvedReferenceList({
      list: input.updateValue(),
      data: input('data'),
      find: input('find'),
    }),

    exposeDependency({dependency: '#resolvedReferenceList'}),
  ],
});

export {default} from './atomic/referenceList.js';
