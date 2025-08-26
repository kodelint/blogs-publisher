const getOctokit = jest.fn();
const context = {
  eventName: "push",
  payload: {
    before: "abc123",
    after: "def456",
    commits: [],
    head_commit: { message: "test commit message" }, // Add this line
    pull_request: {
      number: 1,
    },
  },
  repo: {
    owner: "test-owner",
    repo: "test-repo",
  },
};

export { getOctokit, context };
