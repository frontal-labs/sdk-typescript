# Security Policy

## Supported Versions

| Version | Supported          |
|---------|-------------------|
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please send an email to: **security@frontal.dev**

### What to Include

- **Type of issue** (e.g., supply chain attack, prototype pollution, dependency confusion, etc.)
- **Full paths** of source file(s) related to the manifestation of the issue
- **Location** of the affected source code (tag/branch/commit or direct URL)
- **Step-by-step instructions** to reproduce the issue
- **Proof-of-concept or exploit code** (if possible)
- **Impact** of the issue, including how an attacker might exploit it

### Response Timeline

- **Initial response**: Within 48 hours
- **Detailed response**: Within 7 days
- **Resolution**: As soon as possible, typically within 30 days

## Security Measures

### Package Security
- **Signed releases**: All npm packages are published with provenance attestation
- **Lockfile verification**: Dependencies are pinned and verified
- **Dependency scanning**: Automated vulnerability scanning on all PRs
- **Code review**: Security-focused review for all changes

### Supply Chain Security
- **SLSA compliance**: Build provenance for all published packages
- **Package integrity**: Verified through npm registry signatures
- **Least privilege**: SDK follows principle of least privilege for API access

## Security Contacts

- **Email**: security@frontal.dev
- **Response Time**: Within 48 hours

## Safe Harbor

This security policy is intended to give security researchers clear guidelines for conducting vulnerability discovery activities. We consider activities conducted in accordance with this policy to be authorized.

Thank you for helping keep the Frontal TypeScript SDK secure!
