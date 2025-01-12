// Gets the flash's act. This will early exit if flashActData is missing.
// If there's no flash whose list of flashes includes this flash, the output
// dependency will be null.

import {templateCompositeFrom} from '#composite';

import {withUniqueReferencingThing} from '#composite/wiki-data';
import {soupyReverse} from '#composite/wiki-properties';

export default templateCompositeFrom({
  annotation: `withFlashAct`,

  outputs: ['#flashAct'],

  steps: () => [
    withUniqueReferencingThing({
      reverse: soupyReverse.input('flashActsWhoseFlashesInclude'),
    }).outputs({
      ['#uniqueReferencingThing']: '#flashAct',
    }),
  ],
});
