# Security Policy

## Supported Versions

We are committed to maintaining the security of the Frontal SDK. Currently, we support the following versions:

| Version | Support Status | End of Life |
| ------- | -------------- | ------------ |
| 1.x     | Supported    | TBD           |
| < 1.0   | Unsupported | N/A           |

**Recommendation**: Always use the latest version to ensure you have the most recent security fixes and features.

## Reporting a Vulnerability

We take security seriously and appreciate your help in making the Frontal SDK more secure.

### How to Report

If you discover a security vulnerability, please **do not open a public issue**. Instead, report it privately to our security team.

**Primary Contact Methods:**
- **Email**: security@frontal.cloud
- **GitHub**: Use [GitHub's private reporting feature](https://docs.github.com/en/github/site-policy/github-private-reporting)
- **Discord**: Contact any moderator in the Frontal Discord server with "Security" prefix

### What to Include

When reporting a vulnerability, please provide:

- **Vulnerability Description**: Clear description of the security issue
- **Reproduction Steps**: Step-by-step instructions to reproduce the issue
- **Impact Assessment**: Potential impact on users and systems
- **Environment Details**: SDK version, Node.js/Bun version, OS, etc.
- **Proof of Concept**: Code snippet or minimal reproduction if possible

### Response Timeline

We are committed to addressing security issues promptly:

- **Initial Response**: Within 48 hours of receiving the report
- **Detailed Assessment**: Within 7 business days
- **Fix Timeline**: Based on severity, typically within 30 days
- **Public Disclosure**: After fix is available and tested

## Security Measures

### Built-in Protections

The Frontal SDK includes several security features:

- **Input Validation**: Sanitization of user inputs
- **Secure Defaults**: Secure configuration by default
- **Dependency Scanning**: Automated scanning of dependencies
- **Code Review**: Security-focused code reviews

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

1. **Assessment**: Evaluate severity and impact
2. **Development**: Create and test security patches
3. **Release**: Publish security updates promptly
4. **Notification**: Inform users of security updates
5. **Documentation**: Update security documentation

### Security Advisories

We publish security advisories for:

- **Critical Issues**: Within 24 hours of fix availability
- **High Priority**: Within 48 hours of fix availability
- **Medium/Low**: With next scheduled release

Subscribe to security updates:
- **GitHub Security Advisories**: [Watch our repository](https://github.com/frontal-cloud/sdk-ts/security/advisories)
- **Email Newsletter**: Subscribe at [frontal.cloud](https://frontal.cloud)
- **Discord**: Join our security announcements channel

## Vulnerability Disclosure Policy

### Coordination

We follow responsible disclosure principles:
- **Private Reporting**: Allow time for fixes before public disclosure
- **Coordinated Release**: Work with reporters on disclosure timing
- **Credit**: Acknowledge and credit security researchers

### Bug Bounty Program

We offer rewards for valid security reports:

- **Critical**: Up to $5,000
- **High**: Up to $2,000
- **Medium**: Up to $500
- **Low**: Up to $200

*Rewards are at our discretion based on impact and exploitability.*

## Security Team

Our security team includes:

- **Security Engineers**: Dedicated security specialists
- **Core Maintainers**: Senior developers with security focus
- **External Advisors**: Third-party security experts

## Additional Resources

### Security Tools

- **npm audit**: `npm audit` or `bun audit`
- **Snyk**: [snyk.io](https://snyk.io/) for dependency scanning
- **GitHub Dependabot**: Automated dependency updates
- **CodeQL**: Static code analysis

### Documentation

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [TypeScript Security Guidelines](https://typescript-eslint.io/rules/)

### Community

- [Frontal Discord](https://discord.gg/frontal)
- [GitHub Discussions](https://github.com/frontal-cloud/sdk-ts/discussions)
- [Security Researcher Program](mailto:security@frontal.cloud)

## Compliance

The Frontal SDK is designed to comply with:

- **GDPR**: Data protection and privacy
- **SOC 2**: Security controls and processes
- **Industry Standards**: Following security best practices

---

*Last Updated: March 2026*

*For questions about this security policy, contact security@frontal.cloud*
