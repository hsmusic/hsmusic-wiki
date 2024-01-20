import Thing from '#thing';
import {isName} from '#validators';

import {contentString, directory, name, simpleString}
  from '#composite/wiki-properties';

export class StaticPage extends Thing {
  static [Thing.referenceType] = 'static';
  static [Thing.friendlyName] = `Static Page`;

  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    name: name('Unnamed Static Page'),

    nameShort: {
      flags: {update: true, expose: true},
      update: {validate: isName},

      expose: {
        dependencies: ['name'],
        transform: (value, {name}) => value ?? name,
      },
    },

    directory: directory(),
    content: contentString(),
    stylesheet: simpleString(),
    script: simpleString(),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Name': {property: 'name'},
      'Short Name': {property: 'nameShort'},
      'Directory': {property: 'directory'},

      'Style': {property: 'stylesheet'},
      'Script': {property: 'script'},
      'Content': {property: 'content'},
    },

    ignoredFields: ['Review Points'],
  };
}
