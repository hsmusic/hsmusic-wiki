import {input, templateCompositeFrom} from '#composite';

import {
  isContentString,
  optional,
  validateArrayItems,
  validateProperties,
  validateReference,
} from '#validators';

import {exposeDependency} from '#composite/control-flow';

import {
  inputFindOptions,
  inputSoupyFind,
  inputWikiData,
  withResolvedAnnotatedReferenceList,
} from '#composite/wiki-data';

import {referenceListInputDescriptions, referenceListUpdateDescription}
  from './helpers/reference-list-helpers.js';

export default templateCompositeFrom({
  annotation: `annotatedReferenceList`,

  compose: false,

  inputs: {
    ...referenceListInputDescriptions(),

    data: inputWikiData({allowMixedTypes: true}),
    find: inputSoupyFind(),
    findOptions: inputFindOptions(),

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

      data: input('data'),
      find: input('find'),
      findOptions: input('findOptions'),

      reference: input('reference'),
      annotation: input('annotation'),
      thing: input('thing'),
    }),

    exposeDependency({dependency: '#resolvedAnnotatedReferenceList'}),
  ],
});
