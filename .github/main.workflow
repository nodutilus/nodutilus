workflow "Main workflow" {
  on = "push"
  resolves = ["ESLint checks", "ESLintCC checks", "Tests & Coverage"]
}

action "Install dependencies" {
  uses = "nd-toolkit/ci-cd/github-actions/node-current@master"
  runs = "npm"
  args = "install"
}

action "ESLint checks" {
  uses = "nd-toolkit/ci-cd/github-actions/node-current@master"
  needs = ["Install dependencies"]
  runs = "npm"
  args = "run eslint"
}

action "ESLintCC checks" {
  uses = "nd-toolkit/ci-cd/github-actions/node-current@master"
  needs = ["Install dependencies"]
  runs = "npm"
  args = "run eslintcc"
}

action "Tests & Coverage" {
  uses = "nd-toolkit/ci-cd/github-actions/node-current@master"
  needs = ["Install dependencies"]
  runs = "npm"
  args = "run test"
}