import {input, V} from '#composite';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';
import {contributionList, soupyReverse} from '#composite/wiki-properties';

import {AdditionalFile} from './AdditionalFile.js';

export class SheetMusicFile extends AdditionalFile {
  static [Thing.wikiData] = 'sheetMusicFileData';

  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    artistContribs: contributionList({
      artistProperty: input.value('sheetMusicFileArtistContributions'),
    }),

    // Expose only

    isSheetMusicFile: exposeConstant(V(true)),
  });

  static [Thing.reverseSpecs] = {
    sheetMusicFileArtistContributionsBy:
      soupyReverse.contributionsBy('sheetMusicFileData', 'artistContribs'),
  };
}
