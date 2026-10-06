import {input, V} from '#composite';
import Thing from '#thing';

import {exitWithoutDependency, exposeConstant, exposeDependency}
  from '#composite/control-flow';
import {withPropertyFromObject} from '#composite/data';
import {thing} from '#composite/wiki-properties';

import {TrackSection} from './TrackSection.js';

export class TrackSectionContinuation extends TrackSection {
  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    stem: thing(V(TrackSection)),

    // Expose only

    isTrackSectionContinuation:
      exposeConstant(V(true)),

    name: [
      withPropertyFromObject('stem', V('name')),
      exposeDependency('#stem.name'),
    ],

    color: [
      withPropertyFromObject('stem', V('color')),
      exposeDependency('#stem.color'),
    ],

    isDefaultTrackSection: [
      withPropertyFromObject('stem', V('isDefaultTrackSection')),
      exposeDependency('#stem.isDefaultTrackSection'),
    ],
  });
};
