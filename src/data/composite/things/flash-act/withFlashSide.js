// Gets the flash act's side. This will early exit if flashSideData is missing.
// If there's no side whose list of flash acts includes this act, the output
// dependency will be null.

import {input, templateCompositeFrom} from '#composite';

import {withUniqueReferencingThing} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `withFlashSide`,

  outputs: ['#flashSide'],

  steps: () => [
    withUniqueReferencingThing({
      data: 'flashSideData',
      list: input.value('acts'),
    }).outputs({
      ['#uniqueReferencingThing']: '#flashSide',
    }),
  ],
});
