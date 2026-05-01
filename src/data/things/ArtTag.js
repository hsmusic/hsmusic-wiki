import {input, V} from '#composite';
import Thing from '#thing';
import {unique} from '#sugar';
import {isName} from '#validators';
import {parseAdditionalNames, parseAnnotatedReferences, parseURLs}
  from '#yaml';

import {
  exitWithoutDependency,
  exposeConstant,
  exposeUpdateValueOrContinue,
} from '#composite/control-flow';

import {
  annotatedReferenceList,
  color,
  contentString,
  directory,
  flag,
  referenceList,
  reverseReferenceList,
  name,
  soupyFind,
  soupyReverse,
  thingList,
  urls,
} from '#composite/wiki-properties';

export class ArtTag extends Thing {
  static [Thing.referenceType] = 'tag';
  static [Thing.friendlyName] = `Art Tag`;
  static [Thing.wikiData] = 'artTagData';

  static [Thing.getPropertyDescriptors] = ({AdditionalName}) => ({
    // Update & expose

    name: name(V('Unnamed Art Tag')),
    directory: directory(),
    color: color(),
    isContentWarning: flag(V(false)),
    extraReadingURLs: urls(),

    nameShort: [
      exposeUpdateValueOrContinue({
        validate: input.value(isName),
      }),

      {
        dependencies: ['name'],
        compute: ({name}) =>
          name.replace(/ \([^)]*?\)$/, ''),
      },
    ],

    additionalNames: thingList(V(AdditionalName)),

    description: contentString(),

    directDescendantArtTags: referenceList({
      class: input.value(ArtTag),
      find: soupyFind.input('artTag'),
    }),

    relatedArtTags: annotatedReferenceList({
      class: input.value(ArtTag),
      find: soupyFind.input('artTag'),

      reference: input.value('artTag'),
      thing: input.value('artTag'),
    }),

    // Update only

    find: soupyFind(),
    reverse: soupyReverse(),

    // Expose only

    isArtTag: exposeConstant(V(true)),

    descriptionShort: [
      exitWithoutDependency('description', {
        value: input.value(null),
        mode: input.value('falsy'),
      }),

      {
        dependencies: ['description'],
        compute: ({description}) =>
          description.split('<hr class="split">')[0],
      },
    ],

    directlyFeaturedInArtworks: reverseReferenceList({
      reverse: soupyReverse.input('artworksWhichFeature'),
    }),

    indirectlyFeaturedInArtworks: [
      {
        dependencies: ['allDescendantArtTags'],
        compute: ({allDescendantArtTags}) =>
          unique(
            allDescendantArtTags
              .flatMap(artTag => artTag.directlyFeaturedInArtworks)),
      },
    ],

    // All the art tags which descend from this one - that means its own direct
    // descendants, plus all the direct and indirect descendants of each of those!
    // The results aren't specially sorted, but they won't contain any duplicates
    // (for example if two descendant tags both route deeper to end up including
    // some of the same tags).
    allDescendantArtTags: [
      {
        dependencies: ['directDescendantArtTags'],
        compute: ({directDescendantArtTags}) =>
          unique([
            ...directDescendantArtTags,
            ...directDescendantArtTags.flatMap(artTag => artTag.allDescendantArtTags),
          ]),
      },
    ],

    directAncestorArtTags: reverseReferenceList({
      reverse: soupyReverse.input('artTagsWhichDirectlyAncestor'),
    }),

    // All the art tags which are ancestors of this one as a "baobab tree" -
    // what you'd typically think of as roots are all up in the air! Since this
    // really is backwards from the way that the art tag tree is written in data,
    // chances are pretty good that there will be many of the exact same "leaf"
    // nodes - art tags which don't themselves have any ancestors. In the actual
    // data structure, each node is a Map, with keys for each ancestor and values
    // for each ancestor's own baobab (thus a branching structure, just like normal
    // trees in this regard).
    ancestorArtTagBaobabTree: [
      {
        dependencies: ['directAncestorArtTags'],
        compute: ({directAncestorArtTags}) =>
          new Map(
            directAncestorArtTags
              .map(artTag => [artTag, artTag.ancestorArtTagBaobabTree])),
      },
    ],
  });

  static [Thing.findSpecs] = {
    artTag: {
      referenceTypes: ['tag'],
      bindTo: 'artTagData',

      getMatchableNames: artTag =>
        (artTag.isContentWarning
          ? [`cw: ${artTag.name}`]
          : [artTag.name]),
    },
  };

  static [Thing.reverseSpecs] = {
    artTagsWhichDirectlyAncestor: {
      bindTo: 'artTagData',

      referencing: artTag => [artTag],
      referenced: artTag => artTag.directDescendantArtTags,
    },
  };

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Tag': {property: 'name'},
      'Short Name': {property: 'nameShort'},
      'Directory': {property: 'directory'},
      'Description': {property: 'description'},

      'Extra Reading URLs': {
        property: 'extraReadingURLs',
        transform: parseURLs,
      },

      'Additional Names': {
        property: 'additionalNames',
        transform: parseAdditionalNames,
      },

      'Color': {property: 'color'},
      'Is CW': {property: 'isContentWarning'},

      'Direct Descendant Tags': {property: 'directDescendantArtTags'},

      'Related Tags': {
        property: 'relatedArtTags',
        transform: entries =>
          parseAnnotatedReferences(entries, {
            referenceField: 'Tag',
            referenceProperty: 'artTag',
          }),
      },
    },
  };
}
