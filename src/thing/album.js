import Thing from './thing.js';

import {
    validateReference
} from './structures.js';

import {
    showAggregate,
    withAggregate
} from '../util/sugar.js';

export default class Album extends Thing {
    #tracks = [];

    static updateError = {
        tracks: Thing.extendPropertyError('tracks')
    };

    update(source) {
        withAggregate(({ wrap, call, map }) => {
            if (source.tracks) {
                this.#tracks = map(source.tracks, t => validateReference('track')(t) && t, {
                    errorClass: this.constructor.updateError.tracks
                });
            }
        });
    }

    get tracks() { return this.#tracks; }
}

const album = new Album();

console.log('tracks (before):', album.tracks);

try {
    album.update({
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
