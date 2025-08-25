# Blogs Publisher 📝

[![CI](https://github.com/kodelint/blogs-publisher/actions/workflows/ci-release.yml/badge.svg)](https://github.com/kodelint/blogs-publisher/actions)
[![Coverage](https://codecov.io/gh/kodelint/blogs-publisher/branch/main/graph/badge.svg)](https://codecov.io/gh/kodelint/blogs-publisher)
[![Vulnerabilities](https://img.shields.io/snyk/vulnerabilities/github/kodelint/blogs-publisher)](https://snyk.io/test/github/kodelint/blogs-publisher)
[![GitHub issues](https://img.shields.io/github/issues/kodelint/blogs-publisher)](https://github.com/kodelint/blogs-publisher/issues)
[![GitHub release](https://img.shields.io/github/v/release/kodelint/blogs-publisher)](https://github.com/kodelint/blogs-publisher/releases)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![Open Issues](https://img.shields.io/github/issues/kodelint/blogs-publisher)](https://github.com/kodelint/blogs-publisher/issues)
[![Closed Issues](https://img.shields.io/github/issues-closed/kodelint/blogs-publisher)](https://github.com/kodelint/blogs-publisher/issues?q=is%3Aissue+is%3Aclosed)

A powerful GitHub Action that automatically publishes your Markdown blog posts to **Medium**, **Dev.to**, and **Hashnode** with intelligent platform detection and comprehensive metadata support.

## ✨ Features

- 🎯 **Smart Platform Detection**: Automatically determines target platform based on file path or commit message
- 📁 **Flexible File Organization**: Supports customizable directory structures for different platforms
- 🔄 **Multiple Publishing Options**: Publish based on file paths or commit messages
- 📋 **Rich Metadata Support**: Full support for front-matter, tags, canonical URLs, cover images, and more
- 🧪 **Dry Run Mode**: Test your setup without actually publishing
- 📊 **Comprehensive Testing**: 80%+ test coverage with local and CI testing
- 🔒 **Secure**: No sensitive data stored, uses GitHub secrets for API tokens
- 🚀 **Easy Setup**: Works out of the box with minimal configuration

## 🚀 Quick Start

### Basic Usage

```yaml
name: Publish Blog Posts

on:
  push:
    branches: [main]
    paths: ["posts/**/*.md"]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Publish to blog platforms
        uses: kodelint/blogs-publisher@v1
        with:
          medium_token: ${{ secrets.MEDIUM_TOKEN }}
          devto_token: ${{ secrets.DEVTO_TOKEN }}
          hashnode_token: ${{ secrets.HASHNODE_TOKEN }}
```

### Advanced Configuration

```yaml
- name: Publish blogs with custom paths
  uses: kodelint/blogs-publisher@v1
  with:
    medium_token: ${{ secrets.MEDIUM_TOKEN }}
    devto_token: ${{ secrets.DEVTO_TOKEN }}
    hashnode_token: ${{ secrets.HASHNODE_TOKEN }}
    hashnode_publication_id: ${{ secrets.HASHNODE_PUBLICATION_ID }}
    medium_path: "content/medium"
    devto_path: "content/devto"
    hashnode_path: "content/hashnode"
    use_commit_message: true
    dry_run: false
    posts_directory: "./blog"
    update_already_published: false # Default is `true`
```

## 📂 Directory Structure

### Default Structure

```
posts/
├── medium/
│   ├── my-medium-post.md
│   └── another-medium-article.md
├── devto/
│   ├── dev-tutorial.md
│   └── coding-tips.md
└── hashnode/
    ├── tech-deep-dive.md
    └── career-advice.md
```

### Custom Structure

You can customize the directory structure using the path inputs:

```yaml
with:
  medium_path: "blog/medium-posts"
  devto_path: "articles/dev"
  hashnode_path: "content/hashnode"
```

## 📝 Front-matter Support

The action supports rich front-matter for all platforms:

```markdown
---
title: "My Awesome Blog Post"
description: "A comprehensive guide to awesome blogging"
tags: [javascript, tutorial, webdev]
canonical_url: "https://myblog.com/awesome-post"
cover_image: "https://images.unsplash.com/photo-123456"
published: true
series: "JavaScript Mastery"
---

# My Awesome Blog Post

Your amazing content goes here...
```

### Platform-Specific Metadata

#### Medium

- `title` - Post title
- `tags` - Up to 5 tags
- `canonical_url` - Canonical URL
- `published` - Publication status (true/false)

#### Dev.to

- `title` - Post title
- `description` - Post description
- `tags` - Up to 4 tags
- `canonical_url` - Canonical URL
- `cover_image` - Cover image URL
- `series` - Series name
- `published` - Publication status (true/false)

#### Hashnode

- `title` - Post title
- `description` - Post subtitle
- `tags` - Unlimited tags
- `cover_image` - Cover image URL
- `canonical_url` - Original article URL
- `slug` - Custom slug (optional)
- `published` - Publication status (true/false)

## 🎯 Platform Detection

### Method 1: File Path Detection (Default)

Place your markdown files in the appropriate directories:

- `posts/medium/` → Publishes to Medium
- `posts/devto/` → Publishes to Dev.to
- `posts/hashnode/` → Publishes to Hashnode

### Method 2: Commit Message Detection

Enable commit message detection:

```yaml
with:
  use_commit_message: true
```

Then use commit messages like:

- `"Add new post to medium"`
- `"Update dev.to article"`
- `"Publish to hashnode"`

## 🔧 Configuration

### Inputs

| Input                     | Description                               | Required | Default          |
|---------------------------|-------------------------------------------|----------|------------------|
| `medium_token`            | Medium Integration Token                  | No\*     | -                |
| `devto_token`             | Dev.to API Key                            | No\*     | -                |
| `hashnode_token`          | Hashnode Personal Access Token            | No\*     | -                |
| `hashnode_publication_id` | Hashnode Publication ID                   | No       | -                |
| `medium_path`             | Medium posts directory pattern            | No       | `posts/medium`   |
| `devto_path`              | Dev.to posts directory pattern            | No       | `posts/devto`    |
| `hashnode_path`           | Hashnode posts directory pattern          | No       | `posts/hashnode` |
| `use_commit_message`      | Use commit message for platform detection | No       | `false`          |
| `dry_run`                 | Run without publishing                    | No       | `false`          |
| `posts_directory`         | Base directory for posts                  | No       | `.`              |

\*At least one platform token is required.

### Outputs

| Output            | Description                                |
|-------------------|--------------------------------------------|
| `published-posts` | JSON array of successfully published posts |
| `failed-posts`    | JSON array of posts that failed to publish |

## 🔐 Setting Up API Tokens

### Medium Token

1. Go to [Medium Settings](https://medium.com/me/settings/security)
2. Scroll to "Integration tokens"
3. Create a new token
4. Add it to your repository secrets as `MEDIUM_TOKEN`

### Dev.to Token

1. Go to [Dev.to Settings](https://dev.to/settings/extensions)
2. Generate a new API key
3. Add it to your repository secrets as `DEVTO_TOKEN`

### Hashnode Token

1. Go to [Hashnode Settings](https://hashnode.com/settings/developer)
2. Generate new Personal Access Token (PAT)
3. Add it to your repository secrets as `HASHNODE_TOKEN`
4. (Optional) Get your Publication ID and add as `HASHNODE_PUBLICATION_ID`

## 📊 Example Workflows

### Simple Auto-publish

```yaml
name: Auto-publish Blog Posts

on:
  push:
    branches: [main]
    paths: ["posts/**/*.md"]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: kodelint/blogs-publisher@v1
        with:
          medium_token: ${{ secrets.MEDIUM_TOKEN }}
          devto_token: ${{ secrets.DEVTO_TOKEN }}
          hashnode_token: ${{ secrets.HASHNODE_TOKEN }}
```

### Manual Trigger with Dry Run

```yaml
name: Manual Blog Publishing

on:
  workflow_dispatch:
    inputs:
      dry_run:
        description: "Run in dry_run mode"
        required: false
        default: "true"

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: kodelint/blogs-publisher@v1
        with:
          medium_token: ${{ secrets.MEDIUM_TOKEN }}
          devto_token: ${{ secrets.DEVTO_TOKEN }}
          hashnode_token: ${{ secrets.HASHNODE_TOKEN }}
          dry_run: ${{ github.event.inputs.dry_run }}
```

### Selective Publishing

```yaml
name: Platform-specific Publishing

on:
  push:
    branches: [main]

jobs:
  publish-medium:
    if: contains(github.event.head_commit.message, 'medium')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: kodelint/blogs-publisher@v1
        with:
          medium_token: ${{ secrets.MEDIUM_TOKEN }}
          use_commit_message: true
```

## 🧪 Testing

### Running Tests Locally

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Coverage Requirements

The project maintains 80%+ test coverage across:

- ✅ Unit tests for all clients (Medium, Dev.to, Hashnode)
- ✅ Integration tests for the main publisher
- ✅ Utility function tests
- ✅ Error handling tests

## 🐛 Troubleshooting

### Common Issues

#### "No platform determined"

- **Cause**: File path doesn't match any configured patterns and commit message detection is disabled
- **Solution**: Check your file paths or enable `use_commit_message: true`

#### "Token not provided"

- **Cause**: Required API token is missing
- **Solution**: Ensure you've added the token to your repository secrets

#### "API error: Invalid token"

- **Cause**: API token is incorrect or expired
- **Solution**: Regenerate the token and update your repository secret

#### "File not found"

- **Cause**: The markdown file doesn't exist in the specified location
- **Solution**: Check the file path and `posts_directory` configuration

### Debug Mode

Enable debug logging in your workflow:

```yaml
- uses: kodelint/blogs-publisher@v1
  with:
    # ... your config
  env:
    ACTIONS_STEP_DEBUG: true # Native to GitHub Action
```
Add `DEBUGGING_ENABLED` to your repository environment variables or enable `ACTIONS_STEP_DEBUG`

## 🤝 Contributing

Contributions are welcome!

### Development Setup

```bash
# Clone the repository
git clone https://github.com/kodelint/blogs-publisher.git
cd blogs-publisher

# Install dependencies
npm install

# Run tests
npm test

# Build the action
npm run build && npm run package
```

## 🙏 Acknowledgments

- Thanks to the teams at Medium, Dev.to, and Hashnode for providing excellent APIs
- Inspired by the need for seamless multi-platform blog publishing

## 📚 Additional Resources

- [Medium API Documentation](https://github.com/Medium/medium-api-docs)
- [Dev.to API Documentation](https://developers.forem.com/api)
- [Hashnode API Documentation](https://apidocs.hashnode.com/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

<div align="center">
  <strong>Happy Blogging! 🎉</strong>
</div>
