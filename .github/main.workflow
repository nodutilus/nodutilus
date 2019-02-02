workflow "Tests & Coverage" {
  on = "push"
  resolves = ["Run tests"]
}

action "Install dependencies" {
  uses = "nd-toolkit/github-actions/node-current@master"
  runs = "npm"
  args = "install"
}

action "Run tests" {
  uses = "nd-toolkit/github-actions/node-current@master"
  needs = ["Install dependencies"]
  runs = "npm"
  args = "run test"
}
