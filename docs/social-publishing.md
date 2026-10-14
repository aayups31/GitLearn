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

The HTTPS relay only sends a one-use authorization code and state to the running companion on port 47831. The companion validates its expiring state before exchanging a code. Tokens stay in process memory, so restart or expiration requires reconnection. Requested scopes are not assumed to have been granted; publishing is disabled until the provider confirms the write scope. This can require platform-specific token inspection. A hosted OAuth broker and encrypted long-lived token vault are prerequisites for distributing these integrations to ordinary users without developer credentials.

YouTube defaults to unlisted and uses an approved local export. LinkedIn and X currently publish text. Instagram requires a public HTTPS URL on an explicitly allowed owned host; its bytes must match the approved export hash. Local files cannot be fetched by Instagram. Preparing a media container and finalizing a Reel are separate, durable steps.

Reviews pin account identity, content, campaign revision, media hash and visibility. Submission requires an exact approval hash. Repeated submission does not repeat a write. A timeout or interruption after a write is classified as uncertain, requiring investigation rather than an automatic repost. Accepted is not proof of public availability.

Manual analytics preserve source, date, currency and nulls. Ratios are per report, not summed across channels. They are not an attribution system or settled revenue evidence.

References: [Google OAuth](https://developers.google.com/identity/protocols/oauth2/), [YouTube uploads](https://developers.google.com/youtube/v3/docs/videos/insert), [LinkedIn posts](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api), [LinkedIn token introspection](https://learn.microsoft.com/en-us/linkedin/shared/authentication/token-introspection), [X create post](https://docs.x.com/x-api/posts/create-post), [Meta Instagram API](https://www.postman.com/meta/instagram/folder/1z5vxzu/instagram-api-with-instagram-login).
