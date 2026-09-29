export default {
  data: (tile) => ({
    updateFrequency:
      (tile.updateFrequency === tile.carousel.updateFrequency
        ? null
        : tile.updateFrequency),

    anchorDate:
      (tile.anchorDate === tile.carousel.anchorDate
        ? null
        : tile.anchorDate),
  }),

  generate: (data, {html}) =>
    html.attributes([
      data.updateFrequency &&
        {'data-update-frequency': data.updateFrequency},

      data.anchorDate &&
        {'data-anchor-date': data.anchorDate.toISOString().slice(0, 10)},
    ]),
};
