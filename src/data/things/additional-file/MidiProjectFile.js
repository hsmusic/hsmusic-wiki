import {input, V} from '#composite';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';
import {contributionList, soupyReverse} from '#composite/wiki-properties';

import {AdditionalFile} from './AdditionalFile.js';

export class MidiProjectFile extends AdditionalFile {
  static [Thing.wikiData] = 'midiProjectFileData';

  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    artistContribs: contributionList({
      artistProperty: input.value('midiProjectFileArtistContributions'),
    }),

    // Expose only

    isMidiProjectFile: exposeConstant(V(true)),
  });

  static [Thing.reverseSpecs] = {
    midiProjectFileArtistContributionsBy:
      soupyReverse.contributionsBy('midiProjectFileData', 'artistContribs'),
  };
}
