import {input, V} from '#composite';
import Thing from '#thing';

import {exposeConstant, exposeDependency} from '#composite/control-flow';
import {withNearbyItemFromList, withPropertyFromObject} from '#composite/data';
import {contentString, directory, name, thing}
  from '#composite/wiki-properties';

export class WikiUpdateSection extends Thing {
  static [Thing.friendlyName] = `Wiki Update Section`;
  static [Thing.wikiData] = 'wikiUpdateSectionData';

  static [Thing.getPropertyDescriptors] = ({WikiUpdate}) => ({
    // Update & expose

    update: thing(V(WikiUpdate)),

    name: name(V(`Unnamed Wiki Update Section`)),
    hash: directory(),

    changes: contentString(),

    // Expose only

    isWikiUpdateSection: exposeConstant(V(true)),

    nextSection: [
      withPropertyFromObject('update', V('sections')),
      withNearbyItemFromList('#update.sections', input.myself(), V(+1)),
      exposeDependency('#nearbyItem'),
    ],

    previousSection: [
      withPropertyFromObject('update', V('sections')),
      withNearbyItemFromList('#update.sections', input.myself(), V(-1)),
      exposeDependency('#nearbyItem'),
    ],
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Section': {property: 'name'},
      'Hash Link': {property: 'hash'},

      'Changes': {property: 'changes'},
    },
  };
}
