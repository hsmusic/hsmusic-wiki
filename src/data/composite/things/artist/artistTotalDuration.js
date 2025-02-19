import {input, templateCompositeFrom} from '#composite';

import {exposeDependency} from '#composite/control-flow';
import {withFilteredList, withPropertyFromList} from '#composite/data';
import {withContributionListSums, withReverseReferenceList}
  from '#composite/wiki-data';
import {soupyReverse} from '#composite/wiki-properties';

export default templateCompositeFrom({
  annotation: `artistTotalDuration`,

  compose: false,

  steps: () => [
    withReverseReferenceList({
      reverse: soupyReverse.input('trackArtistContributionsBy'),
    }).outputs({
      '#reverseReferenceList': '#contributionsAsArtist',
    }),

    withReverseReferenceList({
      reverse: soupyReverse.input('trackContributorContributionsBy'),
    }).outputs({
      '#reverseReferenceList': '#contributionsAsContributor',
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
      property: input.value('isMainRelease'),
    }),

    withFilteredList({
      list: '#allContributions',
      filter: '#allContributions.thing.isMainRelease',
    }).outputs({
      '#filteredList': '#mainReleaseContributions',
    }),

    withContributionListSums({
      list: '#mainReleaseContributions',
    }),

    exposeDependency({
      dependency: '#contributionListDuration',
    }),
  ],
});
