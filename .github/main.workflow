workflow "ESLint & Tests & Coverage" {
  on = "push"
  resolves = ["ESLint checks"]
}

action "Install dependencies" {
  uses = "nd-toolkit/github-actions/node-current@master"
  runs = "npm"
  args = "install"
}

action "ESLint checks" {
  uses = "nd-toolkit/github-actions/node-current@master"
  needs = ["Install dependencies"]
  runs = "eslint"
  args = ". --max-warnings 0"
}
