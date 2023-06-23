import {stitchArrays} from '../../util/sugar.js';

export default {
  extraDependencies: ['html'],

  slots: {
    images: {validate: v => v.arrayOf(v.isHTML)},
    links: {validate: v => v.arrayOf(v.isHTML)},
    names: {validate: v => v.arrayOf(v.isString)},
    info: {validate: v => v.arrayOf(v.isString)},

    lazy: {validate: v => v.oneOf(v.isWholeNumber, v.isBoolean)},
  },

  generate(slots, {html}) {
    return (
      html.tag('div', {class: 'grid-listing'},
        stitchArrays({
          image: slots.images,
          link: slots.links,
          name: slots.names,
          info: slots.info,
        }).map(({image, link, name, info}, index) =>
            link.slots({
              attributes: {class: ['grid-item', 'box']},
              content: [
                image.slots({
                  thumb: 'medium',
                  square: true,
                  lazy:
                    (typeof slots.lazy === 'number'
                      ? index >= slots.lazy
                   : typeof slots.lazy === 'boolean'
                      ? slots.lazy
                      : false),
                }),
                html.tag('span', {[html.onlyIfContent]: true}, name),
                html.tag('span', {[html.onlyIfContent]: true}, info),
              ],
            }))));
  },
};
