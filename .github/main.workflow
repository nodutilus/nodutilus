workflow "Tests" {
  on = "push"
  resolves = ["Run Tests"]
}

action "Install" {
  uses = "actions/npm@e7aaefe"
  runs = "npm install"
}

action "Run Tests" {
  uses = "actions/npm@e7aaefe"
  runs = "npm run test"
  needs = ["Install"]
}
