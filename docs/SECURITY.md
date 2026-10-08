# Security Policy

## Supported Versions

Support applies to each published package's own version. The unified SDK's
version does not promote a pre-1.0 service package to a stable support level.

| Package version | Status | Support commitment |
| --- | --- | --- |
| 1.x | Supported | Security fixes and maintenance releases under this policy |
| 0.x (`<1.0`) | Preview | Best effort; no enterprise support or availability commitment |

**Recommendation**: Always use the latest version to ensure you have the most recent security fixes and features.

## Reporting a Vulnerability

We take security seriously and appreciate your help in making the Frontal SDK more secure.

### How to Report

If you discover a security vulnerability, please **do not open a public issue**.
Report it privately using GitHub's private reporting feature or the security
contact below.

**Primary Contact Methods:**
- **Email**: security@frontal.cloud
- **GitHub**: Use [GitHub's private reporting feature](https://docs.github.com/en/github/site-policy/github-private-reporting)

### What to Include

When reporting a vulnerability, please provide:

- **Vulnerability Description**: Clear description of the security issue
- **Reproduction Steps**: Step-by-step instructions to reproduce the issue
- **Impact Assessment**: Potential impact on users and systems
- **Environment Details**: SDK version, Node.js/Bun version, OS, etc.
- **Proof of Concept**: Code snippet or minimal reproduction if possible

### Response Expectations

This repository does not define a response-time or fix-time commitment. Confirm
the current security contact, response target, and disclosure process with the
Frontal security owner before relying on them for an enterprise requirement.

## Security Measures

### Repository Controls

- Client configuration is validated with Zod, and endpoint response schemas
  validate responses where a service method supplies a schema.
- The repository configures weekly Dependabot update pull requests in
  [`.github/dependabot.yml`](../.github/dependabot.yml).
- A CodeQL workflow analyzes JavaScript and TypeScript on pushes, pull requests,
  and a weekly schedule in [`.github/workflows/codeql.yml`](../.github/workflows/codeql.yml).
- CI builds, lints, type-checks, and tests the SDK. These checks do not verify
  platform controls or replace a security assessment of an integration.

### Best Practices for Users

Follow these security best practices when using the Frontal SDK:

#### API Keys and Credentials

```typescript
// ✅ Good: Use environment variables
const apiKey = process.env.FRONTAL_API_KEY;

// ❌ Bad: Hardcode credentials
const apiKey = "sk-1234567890abcdef";
```

#### Data Handling

- Never log sensitive data (API keys, tokens, personal information)
- Use HTTPS for all network communications
- Validate and sanitize all inputs
- Implement proper error handling without exposing internals

#### Dependencies

- Keep dependencies updated to latest secure versions
- Review dependency security advisories regularly
- Use `npm audit` or `bun audit` to check for vulnerabilities

## Security Updates

### How We Handle Security Issues

Maintainers should assess reported impact, coordinate a fix, and agree on
disclosure with the reporter. This repository does not define a severity-based
release schedule or notification SLA.

### Security Advisories

Security advisories can be published through GitHub when a public advisory is
appropriate. This repository does not define a publication deadline.

Subscribe to security updates:
- **GitHub Security Advisories**: [Watch our repository](https://github.com/frontal-labs/sdk-typescript/security/advisories)

## Vulnerability Disclosure Policy

### Coordination

We follow responsible disclosure principles:
- **Private Reporting**: Allow time for fixes before public disclosure
- **Coordinated Release**: Work with reporters on disclosure timing
- **Credit**: Acknowledge and credit security researchers

This repository does not specify a bug bounty program or reward amounts. Confirm
any current program terms with the security owner.

## Additional Resources

### Security Tools

- **npm audit**: `npm audit` or `bun audit`
- **GitHub Dependabot**: Weekly dependency update configuration in this repository
- **CodeQL**: Static code analysis

### Documentation

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [TypeScript Security Guidelines](https://typescript-eslint.io/rules/)

### Community

- [GitHub Discussions](https://github.com/frontal-labs/sdk-typescript/discussions)
- [Security contact](mailto:security@frontal.cloud)

## Compliance

This SDK repository does not certify or establish that the Frontal platform is
GDPR-compliant or SOC 2-attested. Those claims depend on platform controls,
contractual terms, and independent assurance materials that are outside this
repository. Enterprise customers should request the current security package,
including applicable audit reports, a DPA, subprocessors, retention and data
residency terms, incident commitments, and penetration-test summaries. See
[`ENTERPRISE_READINESS.md`](./ENTERPRISE_READINESS.md) for repository evidence
and open qualification items.

---

*Last Updated: October 2026*

*For questions about this security policy, contact security@frontal.cloud*
