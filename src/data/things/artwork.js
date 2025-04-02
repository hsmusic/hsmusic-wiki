import {input} from '#composite';
import Thing from '#thing';
import {isContributionList, isDate, validateReferenceList} from '#validators';
import {parseContributors, parseDate} from '#yaml';

import {withPropertyFromObject} from '#composite/data';
import {contentString, simpleString, soupyFind, thing}
  from '#composite/wiki-properties';

import {
  exposeConstant,
  exposeDependency,
  exposeDependencyOrContinue,
  exposeUpdateValueOrContinue,
} from '#composite/control-flow';

import {
  withRecontextualizedContributionList,
  withResolvedContribs,
  withResolvedReferenceList,
} from '#composite/wiki-data';

import {withDate} from '#composite/things/artwork';

export class Artwork extends Thing {
  static [Thing.referenceType] = 'artwork';

  static [Thing.getPropertyDescriptors] = ({
    ArtTag,
    Contribution,
  }) => ({
    // Update & expose

    thing: thing(),

    label: simpleString(),
    source: contentString(),

    dateFromThingProperty: simpleString(),

    date: [
      withDate({
        from: input.updateValue({validate: isDate}),
      }),

      exposeDependency({dependency: '#date'}),
    ],

    artistContribsFromThingProperty: simpleString(),
    artistContribsArtistProperty: simpleString(),

    artistContribs: [
      withDate(),

      withResolvedContribs({
        from: input.updateValue({validate: isContributionList}),
        date: '#date',
        artistProperty: 'artistContribsArtistProperty',
      }),

      exposeDependencyOrContinue({
        dependency: '#resolvedContribs',
        mode: input.value('empty'),
      }),

      {
        dependencies: ['thing', 'artistContribsFromThingProperty'],
        compute: (continuation, {thing, artistContribsFromThingProperty}) =>
          (artistContribsFromThingProperty
            ? continuation({
                '#artistContribs':
                  thing[artistContribsFromThingProperty],
              })
            : continuation.exit(null)),
      },

      withRecontextualizedContributionList({
        list: '#artistContribs',
      }),

      exposeDependency({
        dependency: '#artistContribs',
      }),
    ],

    artTags: [
      withResolvedReferenceList({
        list: input.updateValue({
          validate:
            validateReferenceList(ArtTag[Thing.referenceType]),
        }),

        find: soupyFind.input('artTag'),
      }),

      exposeDependencyOrContinue({
        dependency: '#resolvedReferenceList',
        mode: input.value('empty'),
      }),

      withPropertyFromObject({
        object: 'thing',
        property: input.value('artTags'),
      }),

      exposeDependencyOrContinue({
        dependency: '#thing.artTags',
      }),

      exposeConstant({
        value: input.value([]),
      }),
    ],

    // Update only

    find: soupyFind(),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Label': {property: 'label'},
      'Source': {property: 'source'},

      'Date': {
        property: 'date',
        transform: parseDate,
      },

      'Artists': {
        property: 'artistContribs',
        transform: parseContributors,
      },

      'Tags': {property: 'artTags'},
    },
  };
}
