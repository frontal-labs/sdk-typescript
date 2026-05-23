module.exports = {
	extends: ["@commitlint/config-conventional"],

	rules: {
		"type-enum": [
			2,
			"always",
			[
				"feat",
				"fix",
				"docs",
				"style",
				"refactor",
				"perf",
				"test",
				"build",
				"ci",
				"chore",
				"revert",
			],
		],

		"scope-enum": [
			2,
			"always",
			[
				// Core library packages
				"agents",
				"ai",
				"blob",
				"core",
				"functions",
				"graph",
				"ontology",
				"pipelines",
				"testing",
				"workflows",

				// Workspace-level scopes
				"repo",
				"deps",
				"ci",
				"release",
				"docs",
				"scripts",
				"misc",
			],
		],

		// Hygiene
		"type-empty": [2, "never"],
		"scope-empty": [2, "never"],
		"subject-empty": [2, "never"],
		"subject-full-stop": [2, "never", "."],
		"header-max-length": [2, "always", 100],
	},

	ignores: [(msg) => msg.startsWith("Merge ") || msg.startsWith('Revert "')],

	prompt: {
		questions: {
			type: {
				description: "Select the type of change that you're committing:",
				enum: {
					feat: {
						description: "A new feature",
						title: "Features",
					},
					fix: {
						description: "A bug fix",
						title: "Bug Fixes",
					},
					docs: {
						description: "Documentation only changes",
						title: "Documentation",
					},
					style: {
						description: "Changes that do not affect the meaning of the code",
						title: "Styles",
					},
					refactor: {
						description:
							"A code change that neither fixes a bug nor adds a feature",
						title: "Code Refactoring",
					},
					perf: {
						description: "A code change that improves performance",
						title: "Performance Improvements",
					},
					test: {
						description: "Adding missing tests or correcting existing tests",
						title: "Tests",
					},
					build: {
						description:
							"Changes that affect the build system or external dependencies",
						title: "Builds",
					},
					ci: {
						description: "Changes to our CI configuration files and scripts",
						title: "Continuous Integrations",
					},
					chore: {
						description: "Other changes that don't modify src or test files",
						title: "Chores",
					},
					revert: {
						description: "Reverts a previous commit",
						title: "Reverts",
					},
				},
			},
			scope: {
				description: "What is the scope of this change",
				enum: {
					agents: { description: "Anything @frontal/agents specific" },
					ai: { description: "Anything @frontal/ai specific" },
					blob: { description: "Anything @frontal/blob specific" },
					core: { description: "Anything @frontal/core specific" },
					functions: { description: "Anything @frontal/functions specific" },
					graph: { description: "Anything @frontal/graph specific" },
					ontology: { description: "Anything @frontal/ontology specific" },
					pipelines: { description: "Anything @frontal/pipelines specific" },
					testing: { description: "Anything @frontal/testing specific" },
					workflows: { description: "Anything @frontal/workflows specific" },
					repo: { description: "Repository-level changes" },
					deps: { description: "Dependencies" },
					ci: { description: "Changes to CI" },
					release: { description: "Release process" },
					docs: { description: "Documentation" },
					scripts: { description: "Build/dev scripts" },
					misc: { description: "Miscellaneous" },
				},
			},
			subject: {
				description:
					"Write a short, imperative tense description of the change",
			},
			isBreaking: {
				description: "Are there any breaking changes?",
				default: false,
			},
			breakingBody: {
				description:
					"A BREAKING CHANGE commit requires a body. Please enter a longer description of the commit itself",
			},
			isIssueAffected: {
				description: "Does this change affect any open issues?",
				default: false,
			},
			issues: {
				description: 'Add issue references (e.g. "fix #123", "re #123".)',
			},
		},
		settings: {
			enableMultipleScopes: false,
		},
	},
};
