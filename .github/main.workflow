workflow "Tests & Coverage" {
  on = "push"
  resolves = ["Install Dependencies"]
}

action "Install Dependencies" {
  uses = "nd-toolkit/github-actions/node-current@master"
}
