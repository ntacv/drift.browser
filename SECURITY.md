# Security Policy

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in Drift Browser, please report it responsibly by emailing the maintainer directly or using GitHub's private vulnerability reporting feature.

### What to Include

When reporting a security issue, please include:

- **Description**: A clear description of the vulnerability
- **Impact**: What an attacker could potentially do
- **Steps to Reproduce**: Detailed steps to reproduce the issue
- **Affected Versions**: Which version(s) are affected
- **Suggested Fix**: If you have a proposed solution (optional)
- **Your Contact Info**: How we can reach you for follow-up

### Response Timeline

- **Acknowledgment**: We aim to acknowledge receipt within 48 hours
- **Initial Assessment**: We will provide an initial assessment within 5 business days
- **Resolution**: Critical vulnerabilities will be prioritized for immediate patching

### Security Scope

This project is designed as a mobile web browser. Security-relevant areas include:

- **WebView Security**: XSS, code injection, or sandbox escapes
- **Data Storage**: Unencrypted sensitive data, insecure permissions
- **Authentication**: OAuth/sync credential handling
- **Network Security**: TLS/certificate validation, MITM vulnerabilities
- **Privacy**: Data leakage, tracking, unauthorized permissions

### Disclosure Policy

- We request that you give us reasonable time to fix the issue before public disclosure
- We will coordinate with you on the timing of public disclosure
- We will credit you in the fix/advisory (unless you prefer to remain anonymous)

### Important Notice

⚠️ **This application has been developed by AI agents and may contain bugs, security vulnerabilities, and other issues. Use at your own risk.**

While we take security seriously and will address reported vulnerabilities promptly, users should be aware of the experimental nature of this project and use appropriate caution when handling sensitive data.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.1.x   | :white_check_mark: |
| < 1.1   | :x:                |

We generally support only the latest released version. Critical security fixes may be backported at our discretion.

## Security Best Practices for Users

- Keep the app updated to the latest version
- Review app permissions carefully
- Be cautious when entering sensitive information
- Use device-level security features (lock screen, encryption)
- Regularly review stored bookmarks and history

## Known Limitations

- **Sync encryption**: Currently uses identity transform (no client-side encryption) - see [src/services/syncService.ts](src/services/syncService.ts)
- **OAuth credentials**: Firefox Account OAuth is in POC state - see [src/services/fxaService.ts](src/services/fxaService.ts)
- **Tracker blocking**: Only blocks top-level navigation, not subresources - see [src/components/browser/WebViewWrapper.tsx](src/components/browser/WebViewWrapper.tsx)

## Contact

For security issues, please use GitHub's private vulnerability reporting or contact the repository owner through GitHub.
