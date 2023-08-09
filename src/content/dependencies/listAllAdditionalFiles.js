export default {
  contentDependencies: ['listAllAdditionalFilesTemplate'],

  relations: (relation, spec) =>
    ({page: relation('listAllAdditionalFilesTemplate', spec, 'additionalFiles')}),

  generate: (relations) =>
    relations.page.slot('stringsKey', 'other.allAdditionalFiles'),
};
