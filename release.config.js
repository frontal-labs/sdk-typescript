/**
 * Release configuration for Frontal SDK
 * This config works with changesets for automated releases
 */

export default {
  // Branch configuration
  branches: [
    {
      name: 'main',
      channel: 'latest',
      prerelease: false,
    },
    {
      name: 'beta',
      channel: 'beta',
      prerelease: true,
    },
    {
      name: 'alpha',
      channel: 'alpha',
      prerelease: true,
    },
  ],

  // Repository configuration
  repositoryUrl: 'https://github.com/frontal-cloud/sdk-ts.git',

  // Plugin configuration
  plugins: [
    // Analyze commits for conventional commits
    '@semantic-release/commit-analyzer',

    // Generate release notes from commits
    '@semantic-release/release-notes-generator',

    // Update changelog files
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md',
        changelogTitle: '# Frontal SDK Changelog',
      },
    ],

    // Update package.json versions
    [
      '@semantic-release/npm',
      {
        npmPublish: true,
        pkgRoot: '.',
        tarballDir: 'dist',
      },
    ],

    // Create GitHub release
    [
      '@semantic-release/github',
      {
        assets: [
          {
            path: 'dist/*.tgz',
            label: 'Package tarball',
          },
        ],
        addReleases: 'bottom',
      },
    ],

    // Git operations (commit, tag, push)
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json'],
        message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],
  ],

  // Dry run configuration
  dryRun: false,

  // Global CI configuration
  ci: true,

  // Tag format
  tagFormat: 'v${version}',

  // Release notes configuration
  generateNotes: {
    preset: 'conventionalcommits',
    writerOpts: {
      transform: (commit, context) => {
        const issues = [];

        commit.notes.forEach(note => {
          note.title = `BREAKING CHANGES`;
        });

        if (commit.type === `feat`) {
          commit.type = `Features`;
        } else if (commit.type === `fix`) {
          commit.type = `Bug Fixes`;
        } else if (commit.type === `perf`) {
          commit.type = `Performance Improvements`;
        } else if (commit.type === `revert`) {
          commit.type = `Reverts`;
        } else if (commit.type === `docs`) {
          commit.type = `Documentation`;
        } else if (commit.type === `style`) {
          commit.type = `Styles`;
        } else if (commit.type === `refactor`) {
          commit.type = `Code Refactoring`;
        } else if (commit.type === `test`) {
          commit.type = `Tests`;
        } else if (commit.type === `build`) {
          commit.type = `Build System`;
        } else if (commit.type === `ci`) {
          commit.type = `Continuous Integration`;
        } else if (commit.type === `chore`) {
          commit.type = `Chores`;
        }

        if (typeof commit.hash === `string`) {
          commit.shortHash = commit.hash.substring(0, 7);
        }

        if (typeof commit.subject === `string`) {
          let url = context.repository
            ? `${context.host}/${context.owner}/${context.repository}`
            : context.repoUrl;

          if (url) {
            url = `${url}/issues/`;
            // Issue URLs.
            commit.subject = commit.subject.replace(/#([0-9]+)/g, (_, issue) => {
              issues.push(issue);
              return `[#${issue}](${url}${issue})`;
            });
          }

          if (context.host) {
            // User URLs.
            commit.subject = commit.subject.replace(/@([a-zA-Z0-9_-]+)/g, `[@$1](${context.host}/$1)`);
          }
        }

        // Remove references that already appear in the subject
        commit.references = commit.references.filter(reference => {
          if (issues.indexOf(reference.issue) === -1) {
            return true;
          }

          return false;
        });

        return commit;
      },
      groupBy: `type`,
      commitGroupsSort: `title`,
      commitsSort: [`scope`, `subject`],
      noteGroupsSort: `title`,
    },
  },
};
