import Thing from './thing.js';

export class StaticPage extends Thing {
  static [Thing.referenceType] = 'static';

  static [Thing.getPropertyDescriptors] = ({
    validators: {
      isName,
    },
  }) => ({
    // Update & expose

    name: Thing.common.name('Unnamed Static Page'),

    nameShort: {
      flags: {update: true, expose: true},
      update: {validate: isName},

      expose: {
        dependencies: ['name'],
        transform: (value, {name}) => value ?? name,
      },
    },

    directory: Thing.common.directory(),
    content: Thing.common.simpleString(),
    stylesheet: Thing.common.simpleString(),
  });
}
