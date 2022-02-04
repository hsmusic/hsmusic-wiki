import CacheableObject from './cacheable-object.js';

import {
    isBoolean,
    isColor,
    isLanguageCode,
    isName,
    isString,
    isURL,
} from './validators.js';

export default class WikiInfo extends CacheableObject {
    static propertyDescriptors = {
        // Update & expose

        name: {
            flags: {update: true, expose: true},
            update: {validate: isName, default: 'Unnamed Wiki'}
        },

        // Displayed in nav bar.
        shortName: {
            flags: {update: true, expose: true},
            update: {validate: isName},

            expose: {
                dependencies: ['name'],
                transform: (value, { name }) => value ?? name
            }
        },

        color: {
            flags: {update: true, expose: true},
            update: {validate: isColor}
        },

        // One-line description used for <meta rel="description"> tag.
        description: {
            flags: {update: true, expose: true},
            update: {validate: isString}
        },

        footerContent: {
            flags: {update: true, expose: true},
            update: {validate: isString}
        },

        defaultLanguage: {
            flags: {update: true, expose: true},
            update: {validate: isLanguageCode}
        },

        canonicalBase: {
            flags: {update: true, expose: true},
            update: {validate: isURL}
        },

        // Feature toggles

        enableArtistAvatars: {
            flags: {update: true, expose: true},
            update: {validate: isBoolean, default: false}
        },

        enableFlashesAndGames: {
            flags: {update: true, expose: true},
            update: {validate: isBoolean, default: false}
        },

        enableListings: {
            flags: {update: true, expose: true},
            update: {validate: isBoolean, default: false}
        },

        enableNews: {
            flags: {update: true, expose: true},
            update: {validate: isBoolean, default: false}
        },

        enableArtTagUI: {
            flags: {update: true, expose: true},
            update: {validate: isBoolean, default: false}
        },

        enableGroupUI: {
            flags: {update: true, expose: true},
            update: {validate: isBoolean, default: false}
        },
    };
}
