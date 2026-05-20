import {input, V} from '#composite';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';
import {contributionList, soupyReverse} from '#composite/wiki-properties';

import {AdditionalFile} from './AdditionalFile.js';

export class MiscellaneousAdditionalFile extends AdditionalFile {
  static [Thing.wikiData] = 'miscellaneousAdditionalFileData';

  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    artistContribs: contributionList({
      artistProperty: input.value('miscellaneousAdditionalFileArtistContributions'),
    }),

    // Expose only

    isMiscellaneousAdditionalFile: exposeConstant(V(true)),
  });

  static [Thing.reverseSpecs] = {
    miscellaneousAdditionalFileArtistContributionsBy:
      soupyReverse.contributionsBy('miscellaneousAdditionalFileData', 'artistContribs'),
  };
}
