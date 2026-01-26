import {sortFlashesChronologically} from '#sort';

export default ({
  documentModes: {allInOne},
  thingConstructors: {Flash, FlashAct, FlashSide},
}) => ({
  title: `Process flashes file`,
  file: 'flashes.yaml',

  documentMode: allInOne,
  documentThing: document =>
    ('Side' in document
      ? FlashSide
   : 'Act' in document
      ? FlashAct
      : Flash),

  connect(results) {
    let thing, i;

    for (i = 0; thing = results[i]; i++) {
      if (thing.isFlashSide) {
        const side = thing;
        const acts = [];

        for (i++; thing = results[i]; i++) {
          if (thing.isFlashAct) {
            const act = thing;
            const flashes = [];

            for (i++; thing = results[i]; i++) {
              if (thing.isFlash) {
                const flash = thing;

                flash.act = act;
                flashes.push(flash);

                continue;
              }

              i--;
              break;
            }

            act.side = side;
            act.flashes = flashes;
            acts.push(act);

            continue;
          }

          if (thing.isFlash) {
            throw new Error(`Flashes must be under an act`);
          }

          i--;
          break;
        }

        side.acts = acts;

        continue;
      }

      if (thing.isFlashAct) {
        throw new Error(`Acts must be under a side`);
      }

      if (thing.isFlash) {
        throw new Error(`Flashes must be under a side and act`);
      }
    }
  },

  sort({flashData}) {
    sortFlashesChronologically(flashData);
  },
});
