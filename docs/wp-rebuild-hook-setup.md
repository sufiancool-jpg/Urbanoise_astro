# WP -> Astro Rebuild Setup

This project now supports:

1. Build-time WP auth via environment variables.
2. Automatic rebuild trigger when WordPress posts change.

## 1) Deployment env vars (Astro build)

Set these in your deploy environment (and locally if you build locally):

- `WP_DIRECTORY_USER`
- `WP_DIRECTORY_PASS`

Fallback names are also supported:

- `WP_BASIC_USER` / `WP_BASIC_PASS`
- `WP_USER` / `WP_PASS`

Use `.env.example` as the template.

## 2) Auto rebuild trigger from WordPress

### A. Create a build hook URL in your deploy platform

Examples:

- Netlify: Site settings -> Build & deploy -> Build hooks
- Vercel: Deploy hooks
- Any CI endpoint that starts a site build

### B. Add hook settings in WordPress `wp-config.php`

```php
define('URBANOISE_BUILD_HOOK_URL', 'https://your-build-hook-url');
define('URBANOISE_BUILD_HOOK_SECRET', 'optional-shared-secret');
```

`URBANOISE_BUILD_HOOK_SECRET` is optional, but recommended.

### C. Install the trigger file as a mu-plugin

Copy:

- `automation/wordpress/mu-plugin-urbanoise-rebuild-hook.php`

to:

- `wp-content/mu-plugins/urbanoise-rebuild-trigger.php`

(`mu-plugins` run automatically without manual activation.)

## What triggers a rebuild

- Post published
- Published post updated
- Published post unpublished
- Post deleted

## Validation checklist

1. Publish or edit a post in WordPress.
2. Confirm the build hook receives a POST request.
3. Confirm deploy runs and `/blog` + `/blog/<slug>` update on the live site.

Optional local test:

- `bash scripts/ping-build-hook.sh "<build_hook_url>" "<optional_secret>"`
