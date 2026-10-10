# Deploy the public site on Vercel

Import https://github.com/aayups31/GitLearn into your Vercel account and deploy main. The committed vercel.json sets:

- Framework: Other / no framework.
- Install command: empty; the static website needs no npm dependencies.
- Build command: node scripts/build-site.mjs.
- Output directory: dist/site.
- Environment variables: none. Do not add your OpenAI API key to Vercel.

The static site has product information, setup steps, privacy, real GitHub release links, and the pending Chrome store state. The editor and authenticated companion APIs are excluded from the output. Vercel does not run the desktop app.

If the dashboard retains automatic settings from a previous import, override them with the values above. After the first deployment, add your desired domain in Vercel, set canonical og:url and an absolute og:image in src/site/index.html, and push the change. Future main pushes can redeploy automatically through Vercel's Git integration.

Verify the final public page on desktop and phone, click both download links, inspect the privacy page, and confirm the site makes no requests to /api or 127.0.0.1. Chrome store approval is a separate step; publishing the landing page does not publish the extension.
