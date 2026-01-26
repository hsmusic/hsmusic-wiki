import {V} from '#composite';
import Thing from '#thing';
import {isStringNonEmpty, validateArrayItems} from '#validators';

import {exposeConstant} from '#composite/control-flow';
import {contentString, thingList} from '#composite/wiki-properties';

export class HomepageLayout extends Thing {
  static [Thing.friendlyName] = `Homepage Layout`;
  static [Thing.wikiData] = 'homepageLayout';
  static [Thing.oneInstancePerWiki] = true;

  static [Thing.getPropertyDescriptors] = ({HomepageLayoutSection}) => ({
    // Update & expose

    sidebarContent: contentString(),

    navbarLinks: {
      flags: {update: true, expose: true},
      update: {validate: validateArrayItems(isStringNonEmpty)},
      expose: {transform: value => value ?? []},
    },

    sections: thingList(V(HomepageLayoutSection)),

    // Expose only

    isHomepageLayout: exposeConstant(V(true)),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Homepage': {ignore: true},

      'Sidebar Content': {property: 'sidebarContent'},
      'Navbar Links': {property: 'navbarLinks'},
    },
  };
}
