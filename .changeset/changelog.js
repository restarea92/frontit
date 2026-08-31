/**
 * The bundled formatter prefixes every line with the commit that added the changeset.
 * The 0.1.0 entries were written by hand and carry no hashes, so this keeps the file
 * reading as one document.
 */
export default {
  getReleaseLine: async (changeset) =>
    `\n- ${changeset.summary.trim().replace(/\n/g, '\n  ')}\n`,

  getDependencyReleaseLine: async (_changesets, dependenciesUpdated) =>
    dependenciesUpdated.length === 0
      ? ''
      : ['', '- Updated dependencies', ...dependenciesUpdated.map(
          (dependency) => `  - ${dependency.name}@${dependency.newVersion}`,
        )].join('\n'),
}
