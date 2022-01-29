import Thing from './thing.js';

import {
    isBoolean,
    isColor,
    isCommentary,
    isContributionList,
    isDate,
    isDirectory,
    isDuration,
    isName,
    isURL,
    isString,
    validateArrayItems,
    validateReference,
    validateReferenceList,
} from './validators.js';

export default class Track extends Thing {
    static [Thing.referenceType] = 'track';

    static propertyDescriptors = {
        // Update & expose

        name: {
            flags: {update: true, expose: true},

            update: {
                default: 'Unnamed Track',
                validate: isName
            }
        },

        directory: {
            flags: {update: true, expose: true},
            update: {validate: isDirectory},
            expose: Thing.directoryExpose
        },

        duration: {
            flags: {update: true, expose: true},
            update: {validate: isDuration}
        },

        urls: {
            flags: {update: true, expose: true},

            update: {
                validate: validateArrayItems(isURL)
            }
        },

        dateFirstReleased: {
            flags: {update: true, expose: true},
            update: {validate: isDate}
        },

        coverArtDate: {
            flags: {update: true, expose: true},
            update: {validate: isDate}
        },

        hasCoverArt: {
            flags: {update: true, expose: true},
            update: {default: true, validate: isBoolean}
        },

        hasURLs: {
            flags: {update: true, expose: true},
            update: {default: true, validate: isBoolean}
        },

        referencedTracksByRef: {
            flags: {update: true, expose: true},
            update: {validate: validateReferenceList('track')}
        },

        artistContribsByRef: {
            flags: {update: true, expose: true},
            update: {validate: isContributionList}
        },

        contributorContribsByRef: {
            flags: {update: true, expose: true},
            update: {validate: isContributionList}
        },

        coverArtistContribsByRef: {
            flags: {update: true, expose: true},
            update: {validate: isContributionList}
        },

        artTagsByRef: {
            flags: {update: true, expose: true},
            update: {validate: validateReferenceList('tag')}
        },

        originalReleaseTrackByRef: {
            flags: {update: true, expose: true},
            update: {validate: validateReference('track')}
        },

        commentary: {
            flags: {update: true, expose: true},
            update: {validate: isCommentary}
        },

        lyrics: {
            flags: {update: true, expose: true},
            update: {validate: isString}
        },

        // Update only

        // Expose only
    };
}
