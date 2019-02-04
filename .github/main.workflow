workflow "Tests & Coverage" {
  on = "push"
  resolves = ["Run tests"]
}

action "Install dependencies" {
  uses = "nd-toolkit/github-actions/node-current@master"
  runs = "npm"
  args = "install"
}

action "Prepare build" {
  uses = "nd-toolkit/github-actions/node-current@master"
  needs = ["Install dependencies"]
  runs = "npm"
  args = "run ci-prepare-build"
}

action "ESLint checks" {
  uses = "nd-toolkit/github-actions/node-current@master"
  needs = ["Prepare build"]
  runs = "eslint"
  args = ". --max-warnings 0"
}

action "Run tests" {
  uses = "nd-toolkit/github-actions/node-current@master"
  needs = ["ESLint checks"]
  runs = "npm"
  args = "run test"
}
