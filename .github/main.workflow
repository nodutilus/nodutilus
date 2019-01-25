workflow "Tests & Coverage" {
  on = "push"
  resolves = ["nd-toolkit/github-actions/node-current@master"]
}

action "Install Dependencies" {
  uses = "nd-toolkit/github-actions/node-current@master"
  args = "--version"
}

action "TEST" {
  uses = "nd-toolkit/github-actions/node-current@master"
  needs = ["Install Dependencies"]
  runs = "npm"
  args = "--version"
}

action "nd-toolkit/github-actions/node-current@master" {
  uses = "nd-toolkit/github-actions/node-current@master"
  needs = ["TEST"]
}
