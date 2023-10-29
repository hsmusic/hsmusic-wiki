import {isName} from '#validators';

import {
  directory,
  name,
  simpleString,
} from '#composite/wiki-properties';

import Thing from './thing.js';

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
    content: simpleString(),
    stylesheet: simpleString(),
  });
}
