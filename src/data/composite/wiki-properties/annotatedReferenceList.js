import {input, templateCompositeFrom} from '#composite';

import {
  isContentString,
  isDate,
  optional,
  validateArrayItems,
  validateProperties,
  validateReference,
} from '#validators';

import {exposeDependency} from '#composite/control-flow';
import {inputSoupyFind, inputWikiData, withResolvedAnnotatedReferenceList}
  from '#composite/wiki-data';

import {referenceListInputDescriptions, referenceListUpdateDescription}
  from './helpers/reference-list-helpers.js';

export default templateCompositeFrom({
  annotation: `annotatedReferenceList`,

  compose: false,

  inputs: {
    ...referenceListInputDescriptions(),

    data: inputWikiData({allowMixedTypes: true}),
    find: inputSoupyFind(),

    date: input({
      validate: isDate,
      defaultValue: null,
    }),

    reference: input.staticValue({type: 'string', defaultValue: 'reference'}),
    annotation: input.staticValue({type: 'string', defaultValue: 'annotation'}),
    thing: input.staticValue({type: 'string', defaultValue: 'thing'}),
  },

  update(staticInputs) {
    const {
      [input.staticValue('reference')]: referenceProperty,
      [input.staticValue('annotation')]: annotationProperty,
    } = staticInputs;

    return referenceListUpdateDescription({
      validateReferenceList: type =>
        validateArrayItems(
          validateProperties({
            [referenceProperty]: validateReference(type),
            [annotationProperty]: optional(isContentString),
          })),
    })(staticInputs);
  },

  steps: () => [
    withResolvedAnnotatedReferenceList({
      list: input.updateValue(),

      date: input('date'),

      reference: input('reference'),
      annotation: input('annotation'),
      thing: input('thing'),

      data: input('data'),
      find: input('find'),
    }),

    exposeDependency({dependency: '#resolvedAnnotatedReferenceList'}),
  ],
});
