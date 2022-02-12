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

import Album from './album.js';
import Artist from './artist.js';
import ArtTag from './art-tag.js';

import find from '../util/find.js';

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

        // Previously known as: (track).aka
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

        albumData: Thing.genWikiDataProperty(Album),
        artistData: Thing.genWikiDataProperty(Artist),
        artTagData: Thing.genWikiDataProperty(ArtTag),

        // Expose only

        album: {
            flags: {expose: true},

            expose: {
                dependencies: ['albumData'],
                compute: ({ [this.instance]: track, albumData }) => (
                    albumData?.find(album => album.tracks.includes(track)) ?? null)
            }
        },

        date: {
            flags: {expose: true},

            expose: {
                dependencies: ['albumData', 'dateFirstReleased'],
                compute: ({ albumData, dateFirstReleased, [this.instance]: track }) => (
                    dateFirstReleased ??
                    albumData?.find(album => album.tracks.includes(track))?.date ??
                    null
                )
            }
        },

        // Previously known as: (track).artists
        artistContribs: {
            flags: {expose: true},
            expose: Thing.genContribsExpose('artistContribsByRef')
        },

        artTags: {
            flags: {expose: true},

            expose: {
                dependencies: ['artTagsByRef', 'artTagData'],

                compute: ({ artTagsByRef, artTagData }) => (
                    (artTagsByRef && artTagData
                        ? (artTagsByRef
                            .map(ref => find.tag(ref, {wikiData: {tagData: artTagData}}))
                            .filter(Boolean))
                        : [])
                )
            }
        }
    };
}
