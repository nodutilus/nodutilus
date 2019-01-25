workflow "Tests & Coverage" {
  on = "push"
  resolves = ["Run tests"]
}

action "Install source-builder" {
  uses = "nd-toolkit/github-actions/node-current@master"
  runs = "npm"
  args = "i nd-toolkit/source-builder"
}

action "Run tests" {
  uses = "nd-toolkit/github-actions/node-current@master"
  needs = ["Install source-builder"]
  runs = "npm"
  args = "run test"
}
