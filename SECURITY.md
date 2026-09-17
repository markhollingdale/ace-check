# Security Policy

## Reporting a vulnerability

If you discover a security issue, please report it responsibly. Do not open a
public issue. Instead, email the maintainers with details and we will respond
as quickly as possible.

## Design considerations

This tool is designed to run **locally** on a developer's machine. It is not
intended to be deployed as a multi-tenant public service.

Because the tool accepts arbitrary URLs, be aware of the following:

- **SSRF**: The tool will fetch the target site and its subresources. Only run
  it against sites you own or are authorised to test. Localhost is intentionally
  supported for local development.
- **Privacy**: The tool does not transmit scan data anywhere by default. It makes
  no external API calls other than to the target website, Chrome/Lighthouse
  requirements, and resources loaded by the target page. There is no telemetry.
- **AI integration**: V1 does not call any AI API. Reports are generated locally
  and exported so that you explicitly control what you send to an AI.

## Responsible scanning

- Respect `robots.txt` (enabled by default).
- Keep concurrency conservative to avoid hammering target sites.
- Only scan sites you own or have permission to test.
