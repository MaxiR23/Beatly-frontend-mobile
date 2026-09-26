// INFO: commit message rules. One line, `type(scope): description`, with
// the type equal to the issue's label. No body and no trailers: the
// reasoning goes in the pull request (CLAUDE.md, Workflow).

export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [2, "always", ["feat", "fix", "chore", "docs", "test", "refactor", "ci"]],
    "scope-empty": [2, "never"],
    "header-max-length": [2, "always", 72],
    "body-empty": [2, "always"],
    "footer-empty": [2, "always"],
  },
};
