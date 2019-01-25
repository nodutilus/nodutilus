workflow "Build and deploy on push" {
  on = "push"
  resolves = ["Tests > Coverage"]
}

action "Tests > Coverage" {
  uses = "nd-toolkit/github-actions/node-current@master"
  args = "--version"
  runs = "node"
}
