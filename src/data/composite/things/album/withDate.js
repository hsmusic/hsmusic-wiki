import {templateCompositeFrom} from '#composite';
import {empty} from '#sugar';

export default templateCompositeFrom({
  annotation: `withDate`,

  outputs: ['#date'],

  steps: () => [
    {
      dependencies: ['wikiDates'],

      compute: (continuation, {
        ['wikiDates']: wikiDates,
      }) => continuation({
        ['#date']:
          (empty(wikiDates)
            ? null
            : wikiDates.at(0).toDate()),
      }),
    },
  ],
});
