// TODO: hide if no groups...

export default {
  scope: 'wiki',
  directory: 'artists/by-group',
  target: 'artist',

  featureFlag: 'enableGroupUI',

  stringsKey: 'listArtists.byGroup',
  contentFunction: 'listArtistsByGroup',

  seeAlsoListings: [
    'artists/by-name',
    'artists/by-contribs',
  ],
};
