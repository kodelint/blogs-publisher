export const createMockGitHubContext = () => {
  const mockContext: {
    payload: {
      commits: any[];
      head_commit: any;
    };
  } = {
    payload: {
      commits: [],
      head_commit: null,
    },
  };

  return {
    context: mockContext,
    resetContext: () => {
      mockContext.payload = {
        commits: [],
        head_commit: null,
      };
    },
    setCommits: (commits: any[]) => {
      mockContext.payload.commits = commits;
    },
    setHeadCommit: (headCommit: any) => {
      mockContext.payload.head_commit = headCommit;
    },
  };
};

export const mockGitHubContext = createMockGitHubContext();
