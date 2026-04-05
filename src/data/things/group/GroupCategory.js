import {input, V} from '#composite';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';

import {color, directory, flag, name, referenceList, soupyFind}
  from '#composite/wiki-properties';

export class GroupCategory extends Thing {
  static [Thing.referenceType] = 'group-category';
  static [Thing.friendlyName] = `Group Category`;
  static [Thing.wikiData] = 'groupCategoryData';

  static [Thing.getPropertyDescriptors] = ({Group}) => ({
    // Update & expose

    name: name(V('Unnamed Group Category')),
    directory: directory(),

    useGroupsForDividingReferenceLists: flag(V(false)),
    excludeGroupsFromGalleryTabs: flag(V(false)),

    color: color(),

    groups: referenceList({
      class: input.value(Group),
      find: soupyFind.input('group'),
    }),

    // Update only

    find: soupyFind(),

    // Expose only

    isGroupCategory: exposeConstant(V(true)),
  });

  static [Thing.reverseSpecs] = {
    groupCategoriesWhichInclude: {
      bindTo: 'groupCategoryData',

      referencing: groupCategory => [groupCategory],
      referenced: groupCategory => groupCategory.groups,
    },
  };

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Category': {property: 'name'},

      'Color': {property: 'color'},

      'Use Groups For Dividing Reference Lists': {
        property: 'useGroupsForDividingReferenceLists',
      },

      'Exclude Groups From Gallery Tabs': {
        property: 'excludeGroupsFromGalleryTabs',
      },
    },
  };
}
