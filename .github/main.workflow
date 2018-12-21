workflow "Tests" {
  on = "push"
  resolves = ["Run Tests"]
}

action "Run Tests" {
  uses = "actions/npm@e7aaefe"
  runs = "npm run test"
}
