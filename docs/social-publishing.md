# Social publishing source preview

GTM has real API adapters for YouTube uploads, LinkedIn member text posts, X text posts and Instagram professional-account Reels. These are not yet live-validated with the owner's platform accounts. Public access also depends on each developer application's platform review and API tier. No posts were sent during implementation.

In development, put the following fields in the ignored `.local/creator-platform.env`. Never commit credentials or distribute confidential application secrets inside an installer.

```dotenv
OUTCLASS_YOUTUBE_CLIENT_ID=
OUTCLASS_YOUTUBE_CLIENT_SECRET=
OUTCLASS_LINKEDIN_CLIENT_ID=
OUTCLASS_LINKEDIN_CLIENT_SECRET=
OUTCLASS_X_CLIENT_ID=
OUTCLASS_X_CLIENT_SECRET=
OUTCLASS_INSTAGRAM_CLIENT_ID=
OUTCLASS_INSTAGRAM_CLIENT_SECRET=
# Comma-separated exact hostnames of public media storage you own.
OUTCLASS_MEDIA_PUBLIC_HOSTS=
```

Register exact redirects, one per provider:

```text
https://git-learn-black.vercel.app/v1/social/callback/youtube
https://git-learn-black.vercel.app/v1/social/callback/linkedin
https://git-learn-black.vercel.app/v1/social/callback/x
https://git-learn-black.vercel.app/v1/social/callback/instagram
```

## Create the developer apps

Use the same OutClass name, website `https://git-learn-black.vercel.app/`, and privacy URL `https://git-learn-black.vercel.app/privacy` in each app. Create test access for your own accounts first. Do not enable public access or buy an API plan just to fill these fields.

### YouTube

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create or select an OutClass project.
2. Enable **YouTube Data API v3**. Configure Google Auth Platform branding, audience and data access; add your Google account as a test user while the app is in testing.
3. Create a **Web application** OAuth client. Add the exact `/youtube` HTTPS callback above as an authorized redirect URI.
4. Configure the scopes `https://www.googleapis.com/auth/youtube.upload` and `https://www.googleapis.com/auth/youtube.readonly`.
5. Save the client ID and client secret into the two `OUTCLASS_YOUTUBE_*` fields privately. OAuth is required; a plain YouTube API key cannot authorize an upload.
6. In GTM, connect the account. Before a real upload, confirm which channel is shown and review the approved MP4 and visibility. An API project can face upload restrictions pending Google's audit; OutClass does not bypass them.

Official guides: [Upload a video](https://developers.google.com/youtube/v3/guides/uploading_a_video), [videos.insert restrictions](https://developers.google.com/youtube/v3/docs/videos/insert).

### LinkedIn

1. Open [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps), create an OutClass app and complete its required app/Page verification.
2. Request **Share on LinkedIn** and **Sign In with LinkedIn using OpenID Connect**. Their approval state must permit the requested permissions.
3. Under the app's Auth settings, add the exact `/linkedin` redirect above. The implemented member workflow needs `openid`, `profile`, and `w_member_social`.
4. Save the client ID and client secret into the `OUTCLASS_LINKEDIN_*` fields privately.
5. Connect the member account in GTM. This adapter posts as that member; it does not silently post as a company Page. OutClass checks granted scopes, including token introspection when the exchange omits them.

Official guides: [Share on LinkedIn](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin), [OpenID Connect](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2), [token introspection](https://learn.microsoft.com/en-us/linkedin/shared/authentication/token-introspection).

### X

1. Open [X Developer Console](https://console.x.com/) and create an OutClass app in the account's available project/workspace.
2. Configure user authentication for **OAuth 2.0** with **Read and write** access. Choose the appropriate confidential web-app client type for this companion workflow.
3. Add the exact `/x` callback above and the OutClass website. Requested scopes are `tweet.read`, `tweet.write`, `users.read`, and `offline.access`.
4. Save the OAuth 2.0 client ID and, if issued for this client type, client secret in `OUTCLASS_X_*`. A bearer token for app-only authentication is not a substitute for a user's posting permission.
5. Check the account's current API access, billing and limits yourself before enabling a real post. No API plan or credits are purchased by this setup. Connect in GTM and verify the displayed username.

Official guide: [OAuth 2.0 with PKCE](https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code).

### Instagram

1. Open [Meta for Developers](https://developers.facebook.com/apps/) and create/configure an OutClass app with **Instagram API with Instagram Login**. The implementation uses this login path rather than Facebook Page login.
2. Use an Instagram professional account (business or creator), add the required app roles/testers, and accept the testing invitations.
3. In the Instagram business-login configuration, register the exact `/instagram` redirect above. Configure `instagram_business_basic` and `instagram_business_content_publish`.
4. Save the **Instagram** app ID/client ID and secret shown for this login configuration into `OUTCLASS_INSTAGRAM_*`. Meta has several app identifiers; use the ones its Instagram login flow specifies.
5. App Review and the required access level must be complete before connecting accounts outside the permitted app roles. This implementation remains pending validation with a real eligible account; missing confirmed permissions leave posting disabled.
6. For a Reel, render and approve the MP4, put those exact bytes on storage you own, and add its exact hostname to `OUTCLASS_MEDIA_PUBLIC_HOSTS`. Enter the public HTTPS media URL when preparing a post. Instagram cannot download a localhost file. No storage account has been provisioned by this implementation.

Official reference: [Meta's Instagram API collection](https://www.postman.com/meta/instagram/folder/1z5vxzu/instagram-api-with-instagram-login).

## Start and verify locally

After saving any provider's credentials privately, restart the **source development companion** with `npm run dev`. Keep its default port 47831 for the hosted callback relay. Do not run a second companion on that occupied port. Open GTM, choose Connect account, continue to the provider's consent screen, and return to OutClass after authorization. A provider is ready only when the account identity and its publishing scope are confirmed.

Start with a course, approved creative and campaign. Prepare the exact posting payload and review it. Publishing is a separate explicit action; connecting a channel does not publish anything. If the UI reports an uncertain outcome, inspect the provider account before any new post. Restarting the companion drops process-memory connections and requires authorization again.

The HTTPS relay only sends a one-use authorization code and state to the running companion on port 47831. The companion validates its expiring state before exchanging a code. Tokens stay in process memory, so restart or expiration requires reconnection. Requested scopes are not assumed to have been granted; publishing is disabled until the provider confirms the write scope. This can require platform-specific token inspection. A hosted OAuth broker and encrypted long-lived token vault are prerequisites for distributing these integrations to ordinary users without developer credentials.

YouTube defaults to unlisted and uses an approved local export. LinkedIn and X currently publish text. Instagram requires a public HTTPS URL on an explicitly allowed owned host; its bytes must match the approved export hash. Local files cannot be fetched by Instagram. Preparing a media container and finalizing a Reel are separate, durable steps.

Reviews pin account identity, content, campaign revision, media hash and visibility. Submission requires an exact approval hash. Repeated submission does not repeat a write. A timeout or interruption after a write is classified as uncertain, requiring investigation rather than an automatic repost. Accepted is not proof of public availability.

Manual analytics preserve source, date, currency and nulls. Ratios are per report, not summed across channels. They are not an attribution system or settled revenue evidence.

References: [Google OAuth](https://developers.google.com/identity/protocols/oauth2/), [YouTube uploads](https://developers.google.com/youtube/v3/docs/videos/insert), [LinkedIn posts](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api), [LinkedIn token introspection](https://learn.microsoft.com/en-us/linkedin/shared/authentication/token-introspection), [X create post](https://docs.x.com/x-api/posts/create-post), [Meta Instagram API](https://www.postman.com/meta/instagram/folder/1z5vxzu/instagram-api-with-instagram-login).
