# Security Policy

We take the security of PTET Web and its users seriously. Thank you for helping keep the project safe.

## Supported versions

PTET Web is a static website deployed continuously from the `main` branch. Only the latest
code on `main` (the live site at https://ptet-web.vercel.app) receives security fixes.

## Reporting a vulnerability

**Please do not report security vulnerabilities in public issues, pull requests or discussions.**

Report them privately instead:

1. Go to the [Security tab](https://github.com/AnthropicBots/ptet-web/security) of this repository.
2. Click **Report a vulnerability**.
3. Describe the problem and how to reproduce it.

Please include:

- The affected page, file or component
- Steps to reproduce, with a proof of concept if possible
- The impact you believe it has
- Your browser and operating system, if relevant

## What to expect

- We aim to acknowledge your report within **5 business days**.
- We aim to share an assessment or a fix timeline within **14 days**.
- We will credit you in the fix unless you prefer to stay anonymous.

These are targets, not guarantees. This is a volunteer-run project.

## Scope

In scope:

- Cross-site scripting (XSS) and HTML or script injection in any page or component
- Weaknesses in client-side authentication logic (Firebase sign-in flows)
- Secrets or private credentials committed to the repository
- Vulnerable third-party scripts or links loaded by our pages
- Unsafe handling of user input in forms

Out of scope:

- Denial-of-service or volumetric attacks
- Social engineering or physical attacks
- Vulnerabilities in third-party services (Firebase, Vercel, GitHub); report those to the vendor
- Missing best-practice headers with no demonstrated impact
- Automated scanner output without a working proof of concept

## Secure contribution guidelines

- Never commit secrets: API keys, tokens, passwords, `.env` files or service-account files.
- Firebase web configuration values are not secrets on their own, but they are only safe when
  Firebase Security Rules are configured correctly. Never weaken those rules to make a feature work.
- Do not add third-party scripts without discussing them in an issue first.
- If you accidentally commit a secret, tell a maintainer immediately so it can be rotated.
  Deleting the commit is not enough.