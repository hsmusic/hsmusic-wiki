import Thing from './thing.js';

import {
    isDate,
    isDirectory,
    isName,
} from './validators.js';

export default class NewsEntry extends Thing {
    static [Thing.referenceType] = 'news-entry';

    static propertyDescriptors = {
        // Update & expose

        name: {
            flags: {update: true, expose: true},
            update: {validate: isName}
        },

        directory: {
            flags: {update: true, expose: true},
            update: {validate: isDirectory},
            expose: Thing.directoryExpose
        },

        date: {
            flags: {update: true, expose: true},
            update: {validate: isDate}
        },

        content: {
            flags: {update: true, expose: true},
        },

        // Expose only

        contentShort: {
            flags: {expose: true},

            expose: {
                dependencies: ['content'],

                compute({ content }) {
                    return body.split('<hr class="split">')[0];
                }
            }
        },
    };
}
