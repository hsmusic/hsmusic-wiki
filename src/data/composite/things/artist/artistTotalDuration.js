import {input, templateCompositeFrom} from '#composite';

import {exposeDependency} from '#composite/control-flow';
import {withFilteredList, withPropertyFromList} from '#composite/data';
import {withContributionListSums, withReverseContributionList}
  from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `artistTotalDuration`,

  compose: false,

  steps: () => [
    withReverseContributionList({
      data: 'trackData',
      list: input.value('artistContribs'),
      mode: input.value('contributions'),
    }).outputs({
      '#reverseContributionList': '#contributionsAsArtist',
    }),

    withReverseContributionList({
      data: 'trackData',
      list: input.value('contributorContribs'),
      mode: input.value('contributions'),
    }).outputs({
      '#reverseContributionList': '#contributionsAsContributor',
    }),

    {
      dependencies: [
        '#contributionsAsArtist',
        '#contributionsAsContributor',
      ],

      compute: (continuation, {
        ['#contributionsAsArtist']: artistContribs,
        ['#contributionsAsContributor']: contributorContribs,
      }) => continuation({
        ['#allContributions']: [
          ...artistContribs,
          ...contributorContribs,
        ],
      }),
    },

    withPropertyFromList({
      list: '#allContributions',
      property: input.value('thing'),
    }),

    withPropertyFromList({
      list: '#allContributions.thing',
      property: input.value('isOriginalRelease'),
    }),

    withFilteredList({
      list: '#allContributions',
      filter: '#allContributions.thing.isOriginalRelease',
    }).outputs({
      '#filteredList': '#originalContributions',
    }),

    withContributionListSums({
      list: '#originalContributions',
    }),

    exposeDependency({
      dependency: '#contributionListDuration',
    }),
  ],
});
