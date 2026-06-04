# Changelog

## 0.0.1

### Patch Changes

- Initial public release. Build system refactored: composite TypeScript project
  references enabled across all packages, type declarations generated via tsc,
  npm provenance configured, GitHub Actions CI/CD pipeline with Changesets
  integration.
- Updated dependencies
  - @frontal-labs/core@1.0.1

All notable changes to this package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2024-03-06

### Added

- Initial release of the Agents package
- Multi-provider agent integrations (LangChain, LangGraph, Vercel AI, Mastra)
- Type-safe interfaces for all agent providers
- Comprehensive error handling and retry logic
- Built-in logging capabilities
- Full TypeScript support
- Test suite with comprehensive coverage
- Complete documentation

### Features

- **AgentService**: Main service class for agent interactions
- **Provider Integrations**: Support for multiple AI/agent frameworks
- **Configuration Management**: Flexible configuration system
- **Error Handling**: Robust error management
- **Streaming Support**: Real-time response streaming

### Documentation

- API Reference documentation
- Architecture overview
- Usage guide and examples
- Environment configuration guide
