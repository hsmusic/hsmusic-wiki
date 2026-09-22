import {V} from '#composite';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';
import {contentString, name, simpleString, thing}
  from '#composite/wiki-properties';

export class WikiUpdateSection extends Thing {
  static [Thing.friendlyName] = `Wiki Update Section`;
  static [Thing.wikiData] = 'wikiUpdateSectionData';

  static [Thing.getPropertyDescriptors] = ({WikiUpdate}) => ({
    // Update & expose

    update: thing(V(WikiUpdate)),

    name: name(V(`Unnamed Wiki Update Section`)),
    hash: simpleString(),

    changes: contentString(),

    // Expose only

    isWikiUpdateSection: exposeConstant(V(true)),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Section': {property: 'name'},
      'Hash Link': {property: 'hash'},

      'Changes': {property: 'changes'},
    },
  };
}
