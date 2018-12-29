workflow "Tests & Coverage" {
  on = "push"
  resolves = ["Run Coverage"]
}

action "Install Dependencies" {
  uses = "nd-toolkit/source-builder/github-actions/node@master"
  runs = "npm"
  args = "install"
}

action "Skip Auto-Build" {
  uses = "nd-toolkit/source-builder/github-actions/node@master"
  runs = "npm"
  args = "run filtre-skip-ci"
  needs = [
    "Install Dependencies",
  ]
}

action "Run Coverage" {
  uses = "nd-toolkit/source-builder/github-actions/node@master"
  runs = "npm"
  args = "run coverage"
  needs = [
    "Skip Auto-Build",
  ]
}
