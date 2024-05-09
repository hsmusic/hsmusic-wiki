import {input, templateCompositeFrom} from '#composite';
import Thing from '#thing';
import {isThingClass, validateArrayItems, validateReviewPointList}
  from '#validators';

import {exposeConstant, exposeDependencyOrContinue}
  from '#composite/control-flow';
import {withResolvedContribs} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `reviewPointList`,

  compose: false,

  inputs: {
    class: input.staticValue({
      defaultValue: null,
      validate: isThingClass,
    }),

    classes: input.staticValue({
      defaultValue: null,
      validate: validateArrayItems(isThingClass),
    }),
  },

  update: ({
    [input.staticValue('class')]: thingClass,
    [input.staticValue('classes')]: thingClasses,
  }) => {
    const fields = [];

    const allClasses =
      (thingClass ? [thingClass] : [])
        .concat(thingClasses ?? []);

    for (const {[Thing.yamlDocumentSpec]: yamlDocumentSpec} of allClasses) {
      fields.push(...Object.keys(yamlDocumentSpec.fields));
    }

    return {
      validate: validateReviewPointList({fields}),
    };
  },

  steps: () => [
    // TODO:
    // withResolvedReviewPoints({from: input.updateValue()}),
    // exposeDependencyOrContinue({dependency: '#resolvedReviewPoints'}),

    exposeConstant({value: input.value([])}),
  ],
});
