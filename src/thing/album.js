import Thing from './thing.js';

import {
    isBoolean,
    isColor,
    isCommentary,
    isContributionList,
    isDate,
    isDimensions,
    isDirectory,
    isName,
    isURL,
    isString,
    validateArrayItems,
    validateReference,
    validateReferenceList,
} from './validators.js';

export default class Album extends Thing {
    static propertyDescriptors = {
        // Update & expose

        name: {
            flags: {update: true, expose: true},

            update: {
                default: 'Unnamed Album',
                validate: isName
            }
        },

        color: {
            flags: {update: true, expose: true},
            update: {validate: isColor}
        },

        directory: {
            flags: {update: true, expose: true},
            update: {validate: isDirectory}
        },

        urls: {
            flags: {update: true, expose: true},

            update: {
                validate: validateArrayItems(isURL)
            }
        },

        date: {
            flags: {update: true, expose: true},
            update: {validate: isDate}
        },

        coverArtDate: {
            flags: {update: true, expose: true},
            update: {validate: isDate}
        },

        trackArtDate: {
            flags: {update: true, expose: true},
            update: {validate: isDate}
        },

        dateAddedToWiki: {
            flags: {update: true, expose: true},

            update: {validate: isDate}
        },

        artistContribsByRef: {
            flags: {update: true, expose: true},
            update: {validate: isContributionList}
        },

        coverArtistContribsByRef: {
            flags: {update: true, expose: true},
            update: {validate: isContributionList}
        },

        trackCoverArtistContribsByRef: {
            flags: {update: true, expose: true},
            update: {validate: isContributionList}
        },

        wallpaperArtistContribsByRef: {
            flags: {update: true, expose: true},
            update: {validate: isContributionList}
        },

        bannerArtistContribsByRef: {
            flags: {update: true, expose: true},
            update: {validate: isContributionList}
        },

        groupsByRef: {
            flags: {update: true, expose: true},

            update: {
                validate: validateReferenceList('group')
            }
        },

        artTagsByRef: {
            flags: {update: true, expose: true},

            update: {
                validate: validateReferenceList('tag')
            }
        },

        tracksByRef: {
            flags: {update: true, expose: true},

            update: {
                validate: validateReferenceList('track')
            }
        },

        wallpaperStyle: {
            flags: {update: true, expose: true},
            update: {validate: isString}
        },

        wallpaperFileExtension: {
            flags: {update: true, expose: true},
            update: {validate: isString}
        },

        bannerStyle: {
            flags: {update: true, expose: true},
            update: {validate: isString}
        },

        bannerFileExtension: {
            flags: {update: true, expose: true},
            update: {validate: isString}
        },

        bannerDimensions: {
            flags: {update: true, expose: true},
            update: {validate: isDimensions}
        },

        hasTrackArt: {
            flags: {update: true, expose: true},

            update: {
                default: true,
                validate: isBoolean
            }
        },

        isMajorRelease: {
            flags: {update: true, expose: true},

            update: {
                default: false,
                validate: isBoolean
            }
        },

        isListedOnHomepage: {
            flags: {update: true, expose: true},

            update: {
                default: true,
                validate: isBoolean
            }
        },

        commentary: {
            flags: {update: true, expose: true},
            update: {validate: isCommentary}
        },

        // Expose only

        tracks: {
            flags: {expose: true},

            expose: {
                dependencies: ['trackReferences', 'wikiData'],
                compute: ({trackReferences, wikiData}) => (
                    trackReferences.map(ref => find.track(ref, {wikiData})))
            }
        },

        // Update only

        wikiData: {
            flags: {update: true}
        }
    };
}
