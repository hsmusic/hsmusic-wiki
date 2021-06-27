import Thing from './thing.js';

import {
    validateDirectory,
    validateReference
} from './structures.js';

import {
    showAggregate,
    withAggregate
} from '../util/sugar.js';

export default class Album extends Thing {
    #directory = null;
    #tracks = [];

    static updateError = {
        directory: Thing.extendPropertyError('directory'),
        tracks: Thing.extendPropertyError('tracks')
    };

    update(source) {
        const err = this.constructor.updateError;

        withAggregate(({ nest, filter, throws }) => {

            if (source.directory) {
                nest(throws(err.directory), ({ call }) => {
                    if (call(validateDirectory, source.directory)) {
                        this.#directory = source.directory;
                    }
                });
            }

            if (source.tracks)
                this.#tracks = filter(source.tracks, validateReference('track'), throws(err.tracks));
        });
    }

    get directory() { return this.#directory; }
    get tracks() { return this.#tracks; }
}

const album = new Album();

console.log('tracks (before):', album.tracks);

try {
    album.update({
        directory: 'oh yes',
        tracks: [
            'lol',
            123,
            'track:oh-yeah',
            'group:what-am-i-doing-here'
        ]
    });
} catch (error) {
    showAggregate(error);
}

console.log('tracks (after):', album.tracks);
