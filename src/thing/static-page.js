import Thing from './thing.js';

import {
    isBoolean,
    isDirectory,
    isName,
    isString,
} from './validators.js';

export default class StaticPage extends Thing {
    static [Thing.referenceType] = 'static';

    static propertyDescriptors = {
        // Update & expose

        name: {
            flags: {update: true, expose: true},
            update: {validate: isName, default: 'Unnamed Static Page'}
        },

        nameShort: {
            flags: {update: true, expose: true},
            update: {validate: isName},

            expose: {
                dependencies: ['name'],
                transform: (value, { name }) => value ?? name
            }
        },

        directory: {
            flags: {update: true, expose: true},
            update: {validate: isDirectory},
            expose: Thing.directoryExpose
        },

        content: {
            flags: {update: true, expose: true},
            update: {validate: isString}
        },

        stylesheet: {
            flags: {update: true, expose: true},
            update: {validate: isString}
        },

        showInNavigationBar: {
            flags: {update: true, expose: true},
            update: {validate: isBoolean, default: true}
        },
    };
}
