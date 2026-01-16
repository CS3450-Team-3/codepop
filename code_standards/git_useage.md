
# Git Usage Standards

## Workflow Overview

This document outlines the standardized Git workflow for our project to ensure consistency.

## Step-by-Step Process

### 1. Select an Issue
- Navigate to the project's GitHub Issues tab
- Choose an existing issue from the backlog or create a new one
- Assign yourself to the issue

### 2. Create a Feature Branch
- Click "Create a branch" button on the GitHub issue page
- Use the auto-generated branch name unless there is a reason not to.
- You can then copy the command to pull and checkout the new branch.

### 3. Development Work
- Ensure you are on the correct branch
    ```bash
    git branch
    ```

- Make your code changes
- Commit frequently with clear messages:
    ```bash
    git add .
    git commit -m "descriptive commit message"
    ```
- Test your work often to avoid surprises
- It is a good idea to run a build on what you are working on before pushing

### 4. Push Changes
- Push your commits to the remote branch:
    ```bash
    git push
    ```
    Note: you may need to specify origin or the branch to push to if this does not work.

### 5. Create Pull Request
- Navigate to GitHub and create a PR from your branch to `master`
- Link the PR to the original issue
- Provide a clear description of changes made
- Request reviewers from the team

### 6. Code Review & Merge
- Wait for team review and approval
- Address any requested changes
- Once approved, merge the PR using GitHub's merge button
- The feature branch will be automatically deleted


## Other Info

### Merge Strategies

When merging your PR, GitHub offers three different strategies. Choose based on your development situation:

#### Merge
- Takes one branch and combines it with the code in another branch
- Keeps the complete commit history exactly as it happened
- **Use when**: Multiple people have worked on the same branch for a while, as it preserves who did what code

#### Squash and Merge
- "Merges" all commits in a branch into one single commit
- Good for cleaning up many smaller iterative commits
- **Use when**: You've been working on a feature for a while and you're the only one who has worked on it

#### Rebase and Merge
- Takes your branch and "moves" all its commits past the head of another branch
- Keeps history linear without merge commits
- **Use when**: You need a clean, linear history (use with caution and team coordination)

Choose the appropriate strategy based on your branch's collaboration history and the desired final commit structure.
