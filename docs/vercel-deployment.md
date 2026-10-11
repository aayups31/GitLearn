# Deploy the public site on Vercel

The public site is deployed at https://git-learn-black.vercel.app/. Vercel project `git-learn` is connected to https://github.com/aayups31/GitLearn and deploys `main`. The committed vercel.json sets:

- Framework: Other / no framework.
- Install command: empty; the static website needs no npm dependencies.
- Build command: node scripts/build-site.mjs.
- Output directory: dist/site.
- Environment variables: none. Do not add your OpenAI API key to Vercel.

The static site has product information, setup steps, privacy, real GitHub release links, and the pending Chrome store state. The editor and authenticated companion APIs are excluded from the output. Vercel does not run the desktop app.

Preview downloads are published through GitHub Releases. The page and `src/site/assets/release.json` reference the tested release; Chrome Web Store links stay pending until an approved listing is available. The Vercel deployment needs no API key or desktop data.

If the dashboard retains automatic settings from a previous import, override them with the values above. A custom domain is optional. If you add one, update the canonical URL, og:url, and absolute og:image in src/site/index.html and push the change. Future main pushes redeploy through Vercel's Git integration.

Verify the final public page on desktop and phone, click both download links, inspect the privacy page, and confirm the site makes no requests to /api or 127.0.0.1. Chrome store approval is a separate step; publishing the landing page does not publish the extension.
