// Gets the flash's act. This will early exit if flashActData is missing.
// If there's no flash whose list of flashes includes this flash, the output
// dependency will be null.

import {input, templateCompositeFrom} from '#composite';

import {withUniqueReferencingThing} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `withFlashAct`,

  outputs: ['#flashAct'],

  steps: () => [
    withUniqueReferencingThing({
      data: 'flashActData',
      list: input.value('flashes'),
    }).outputs({
      ['#uniqueReferencingThing']: '#flashAct',
    }),
  ],
});
