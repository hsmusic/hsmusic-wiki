import {input, V} from '#composite';
import Thing from '#thing';

import {exposeConstant, exposeDependency} from '#composite/control-flow';
import {withFlattenedList, withPropertyFromList, withUniqueItemsOnly}
  from '#composite/data';

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
    collapseGroupsInAlbumSidebars: flag(V(false)),
    excludeGroupsFromOtherGroupAlbumSummaries: flag(V(false)),

    color: color(),

    groups: referenceList({
      class: input.value(Group),
      find: soupyFind.input('group'),
    }),

    // Update only

    find: soupyFind(),

    // Expose only

    isGroupCategory: exposeConstant(V(true)),

    albums: [
      withPropertyFromList('groups', V('albums')),

      withFlattenedList('#groups.albums')
        .outputs({'#flattenedList': '#albums'}),

      withUniqueItemsOnly('#albums'),
      exposeDependency('#albums'),
    ],
  });

  static [Thing.findSpecs] = {
    groupCategory: {
      referenceTypes: ['group-category'],
      bindTo: 'groupCategoryData',
    },
  };

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
      'Directory': {property: 'directory'},

      'Color': {property: 'color'},

      'Use Groups For Dividing Reference Lists': {
        property: 'useGroupsForDividingReferenceLists',
      },

      'Collapse Groups In Album Sidebars': {
        property: 'collapseGroupsInAlbumSidebars',
      },

      'Exclude Groups From Other Group Album Summaries': {
        property: 'excludeGroupsFromOtherGroupAlbumSummaries',
      },
    },
  };
}
