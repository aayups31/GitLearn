import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  X,
  ImagePlus,
  Save,
} from "lucide-react";
import {
  postComposition,
  postPreflight,
  type PostComposition,
  type PostImage,
  type PostProvider,
} from "../social-post";
import type { Campaign } from "../expansion-contract";
import type { RenderJob } from "../server/creator-production";
import { SocialPostPreview, platformNames } from "./social-post-preview";
type API = <T>(route: string, body?: unknown) => Promise<T>;
export type ComposerChannel = {
  provider: PostProvider;
  account: { name: string } | null;
  canPublish: boolean;
};
type Draft = {
  revision: number;
  campaignRevision: number;
  composition: PostComposition;
  mediaJobId?: string;
  publicMediaUrl: string;
  publicImageUrls: string[];
  privacy: "private" | "unlisted" | "public";
};
export function SocialComposer({
  api,
  campaign,
  channels,
  media,
  onPrepared,
  onDirty,
}: {
  api: API;
  campaign: Campaign;
  channels: ComposerChannel[];
  media: RenderJob[];
  onPrepared: () => Promise<void>;
  onDirty: (dirty: boolean) => void;
}) {
  const [provider, setProvider] = useState<PostProvider>(
      ["x", "linkedin", "instagram", "youtube"].includes(campaign.source)
        ? (campaign.source as PostProvider)
        : "linkedin",
    ),
    [dirty, setDirty] = useState(false);
  return (
    <section className="post-composer" aria-label="Platform post composer">
      <div className="post-composer-heading">
        <div>
          <h3>Create your post</h3>
          <p>
            Shape the message. Review the actual attachments. Publish one
            approved version.
          </p>
        </div>
        <span className="product-local">
          {dirty ? "Unsaved changes" : "Local draft"}
        </span>
      </div>
      <div
        className="post-platform-tabs"
        role="group"
        aria-label="Post platform"
      >
        {(Object.keys(platformNames) as PostProvider[]).map((p) => (
          <button
            type="button"
            key={p}
            aria-pressed={provider === p}
            onClick={() => {
              if (
                !dirty ||
                confirm(
                  "Discard unsaved post edits before switching platforms?",
                )
              ) {
                setDirty(false);
                setProvider(p);
              }
            }}
          >
            {platformNames[p]}
          </button>
        ))}
      </div>
      <ComposerForm
        key={`${campaign.id}:${campaign.revision}:${provider}`}
        api={api}
        campaign={campaign}
        channel={channels.find((c) => c.provider === provider)}
        provider={provider}
        media={media}
        onPrepared={onPrepared}
        onDirty={onDirty}
        onChanged={setDirty}
      />
    </section>
  );
}
function ComposerForm({
  api,
  campaign,
  channel,
  provider,
  media,
  onPrepared,
  onDirty,
  onChanged,
}: {
  api: API;
  campaign: Campaign;
  channel?: ComposerChannel;
  provider: PostProvider;
  media: RenderJob[];
  onPrepared: () => Promise<void>;
  onDirty: (dirty: boolean) => void;
  onChanged: (dirty: boolean) => void;
}) {
  const initial = (): Draft => ({
    revision: 0,
    campaignRevision: campaign.revision,
    composition: postComposition.parse({
      copy: campaign.creativeSnapshot.copy,
      title: campaign.creativeSnapshot.title.slice(0, 100),
    }),
    publicMediaUrl: "",
    publicImageUrls: [],
    privacy: "unlisted",
  });
  const [draft, setDraft] = useState<Draft>(initial),
    [images, setImages] = useState<PostImage[]>([]),
    [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [file, setFile] = useState<File>(),
    [rights, setRights] = useState(false),
    [imageId, setImageId] = useState("");
  useEffect(() => {
    onDirty(dirty);
    onChanged(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty, onChanged]);
  useEffect(() => {
    let active = true;
    Promise.all([
      api<Draft | null>(
        `expansion/publishing/draft/${campaign.id}/${provider}`,
      ),
      api<PostImage[]>("expansion/social-images"),
    ])
      .then(([saved, library]) => {
        if (!active) return;
        setImages(library);
        if (saved) {
          setDraft(saved);
          if (saved.campaignRevision !== campaign.revision)
            setError(
              "This campaign changed since the draft was saved. Reset to the current campaign before preparing it.",
            );
        }
        setLoaded(true);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [api, campaign.id, campaign.revision, provider]);
  const selected = draft.composition.imageIds
      .map((id) => images.find((i) => i.id === id))
      .filter((i): i is PostImage => !!i),
    video = media.find((j) => j.id === draft.mediaJobId),
    thumbnail = images.find((i) => i.id === draft.composition.thumbnailId);
  const check = postPreflight(
    provider,
    draft.composition,
    campaign.trackedUrl,
    selected,
    video?.output,
    thumbnail,
  );
  function change(patch: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
    setMessage("");
  }
  function compose(patch: Partial<PostComposition>) {
    change({ composition: { ...draft.composition, ...patch } });
  }
  async function act(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    const saved = await api<Draft>("expansion/publishing/draft", {
      campaignId: campaign.id,
      campaignRevision: draft.campaignRevision,
      provider,
      expectedRevision: draft.revision,
      composition: draft.composition,
      ...(draft.mediaJobId ? { mediaJobId: draft.mediaJobId } : {}),
      publicMediaUrl: draft.publicMediaUrl,
      publicImageUrls: draft.publicImageUrls,
      privacy: draft.privacy,
    });
    setDraft(saved);
    setDirty(false);
    setMessage("Draft saved on this device.");
  }
  function remove(index: number) {
    change({
      composition: {
        ...draft.composition,
        imageIds: draft.composition.imageIds.filter((_, i) => i !== index),
        imageAlts: draft.composition.imageIds
          .filter((_, i) => i !== index)
          .map(
            (id) =>
              draft.composition.imageAlts[
                draft.composition.imageIds.indexOf(id)
              ] || "",
          ),
      },
      publicImageUrls: draft.publicImageUrls.filter((_, i) => i !== index),
    });
  }
  function move(index: number, delta: number) {
    const order = draft.composition.imageIds.map((_, i) => i);
    [order[index], order[index + delta]] = [order[index + delta], order[index]];
    change({
      composition: {
        ...draft.composition,
        imageIds: order.map((i) => draft.composition.imageIds[i]),
        imageAlts: order.map((i) => draft.composition.imageAlts[i] || ""),
      },
      publicImageUrls: order.map((i) => draft.publicImageUrls[i] || ""),
    });
  }
  return (
    <>
      <div className="post-composer-body">
        <fieldset className="post-composer-fields" disabled={busy || !loaded}>
          <label>
            Publishing as
            <input
              readOnly
              value={
                channel?.account?.name || "Connect your account to publish"
              }
            />
          </label>
          {provider === "youtube" && (
            <label>
              Video title
              <input
                aria-label="YouTube video title"
                value={draft.composition.title}
                maxLength={100}
                onChange={(e) => compose({ title: e.target.value })}
              />
            </label>
          )}
          <label>
            {provider === "youtube"
              ? "Description"
              : provider === "instagram"
                ? "Caption"
                : "Post text"}
            <textarea
              aria-label={`${platformNames[provider]} post text`}
              value={draft.composition.copy}
              maxLength={5000}
              onChange={(e) => compose({ copy: e.target.value })}
            />
          </label>
          <span
            className={`post-character-count ${check.count > check.limit ? "invalid" : ""}`}
          >
            {check.count.toLocaleString()} / {check.limit.toLocaleString()}{" "}
            {provider === "x" ? "weighted characters" : "characters"} ·
            destination link included
          </span>
          <label>
            Destination link
            <input readOnly value={campaign.trackedUrl} />
          </label>
          <label>
            {provider === "youtube" || provider === "instagram"
              ? "Approved video"
              : "Attach a video (optional)"}
            <select
              aria-label="Post video attachment"
              value={draft.mediaJobId || ""}
              onChange={(e) =>
                change({ mediaJobId: e.target.value || undefined })
              }
            >
              <option value="">
                {provider === "youtube"
                  ? "Select an approved export"
                  : "No video"}
              </option>
              {media
                .filter(
                  (j) => j.approval && j.creativeHash === campaign.creativeHash,
                )
                .map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.timeline.format} · {j.output?.duration.toFixed(1)}s ·{" "}
                    {j.id.slice(0, 8)}
                  </option>
                ))}
            </select>
          </label>
          {provider === "instagram" && draft.mediaJobId && (
            <label>
              Public URL of this exact Reel
              <input
                type="url"
                value={draft.publicMediaUrl}
                onChange={(e) => change({ publicMediaUrl: e.target.value })}
                placeholder="https://your-media-host/reel.mp4"
              />
            </label>
          )}
          {provider !== "youtube" && (
            <>
              <label>
                Attach photos
                <select
                  aria-label="Post image attachment"
                  value={imageId}
                  onChange={(e) => setImageId(e.target.value)}
                >
                  <option value="">Choose an imported image</option>
                  {images
                    .filter((i) => !draft.composition.imageIds.includes(i.id))
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} · {i.width}×{i.height}
                      </option>
                    ))}
                </select>
              </label>
              <button
                type="button"
                className="button small"
                disabled={
                  !imageId || selected.length >= (provider === "x" ? 4 : 10)
                }
                onClick={() => {
                  change({
                    composition: {
                      ...draft.composition,
                      imageIds: [...draft.composition.imageIds, imageId],
                      imageAlts: [...draft.composition.imageAlts, ""],
                    },
                    publicImageUrls: [...draft.publicImageUrls, ""],
                  });
                  setImageId("");
                }}
              >
                <ImagePlus size={14} /> Attach photo
              </button>
              {selected.map((image, i) => (
                <div className="post-media-row" key={image.id}>
                  <div>
                    <small>
                      {i + 1}. {image.name} · {image.width}×{image.height}
                    </small>
                    <label>
                      Alt text
                      <input
                        aria-label={`Photo ${i + 1} alt text`}
                        maxLength={1000}
                        value={draft.composition.imageAlts[i] || ""}
                        onChange={(e) =>
                          compose({
                            imageAlts: draft.composition.imageIds.map((_, n) =>
                              n === i
                                ? e.target.value
                                : draft.composition.imageAlts[n] || "",
                            ),
                          })
                        }
                      />
                    </label>
                    {provider === "instagram" && (
                      <label>
                        Public URL of this exact photo
                        <input
                          type="url"
                          value={draft.publicImageUrls[i] || ""}
                          onChange={(e) =>
                            change({
                              publicImageUrls: draft.composition.imageIds.map(
                                (_, n) =>
                                  n === i
                                    ? e.target.value
                                    : draft.publicImageUrls[n] || "",
                              ),
                            })
                          }
                        />
                      </label>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label={`Move photo ${i + 1} earlier`}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move photo ${i + 1} later`}
                    disabled={i === selected.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove photo ${i + 1}`}
                    onClick={() => remove(i)}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </>
          )}
          {provider === "youtube" && (
            <>
              <label>
                Custom thumbnail
                <select
                  aria-label="YouTube thumbnail"
                  value={draft.composition.thumbnailId || ""}
                  onChange={(e) =>
                    compose({ thumbnailId: e.target.value || undefined })
                  }
                >
                  <option value="">YouTube chooses a frame</option>
                  {images.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} · {i.width}×{i.height}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Visibility
                <select
                  aria-label="YouTube visibility"
                  value={draft.privacy}
                  onChange={(e) =>
                    change({ privacy: e.target.value as Draft["privacy"] })
                  }
                >
                  <option value="unlisted">Unlisted</option>
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                </select>
              </label>
              <label>
                Audience
                <select
                  aria-label="YouTube audience"
                  value={String(draft.composition.madeForKids)}
                  onChange={(e) =>
                    compose({ madeForKids: e.target.value === "true" })
                  }
                >
                  <option value="false">
                    No, this video is not made for kids
                  </option>
                  <option value="true">Yes, this video is made for kids</option>
                </select>
              </label>
              <label>
                Tags (comma-separated)
                <input
                  defaultValue={draft.composition.tags.join(", ")}
                  onBlur={(e) =>
                    compose({
                      tags: e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </label>
            </>
          )}
          <details>
            <summary>Import a photo or thumbnail</summary>
            <p>
              JPEG or PNG, up to 10 MB. OutClass prepares a metadata-free JPEG;
              the preview uses that exact file.
            </p>
            <label>
              Image file
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={(e) => setFile(e.target.files?.[0])}
              />
            </label>
            <label className="product-checkbox">
              <input
                type="checkbox"
                checked={rights}
                onChange={(e) => setRights(e.target.checked)}
              />
              I have permission to publish this image.
            </label>
            <button
              type="button"
              className="button small"
              disabled={!file || !rights}
              onClick={() =>
                void act(async () => {
                  if (file!.size > 10 * 1024 * 1024)
                    throw Error("Choose an image under 10 MB.");
                  const image = await api<PostImage>(
                    `expansion/social-images/import?name=${encodeURIComponent(file!.name)}&rights=confirmed`,
                    file,
                  );
                  setImages((previous) => [...previous, image]);
                  setFile(undefined);
                  setRights(false);
                  setMessage(
                    "Image imported. Select it above to attach it or use it as a thumbnail.",
                  );
                })
              }
            >
              Import image
            </button>
          </details>
          <div className="post-validation" aria-live="polite">
            {check.errors.map((e) => (
              <p className="invalid" key={e}>
                <AlertCircle size={14} />
                {e}
              </p>
            ))}
            {!check.errors.length && (
              <p className="valid">
                <CheckCircle2 size={14} />
                Text and selected media pass the local checks.
              </p>
            )}
            {check.warnings.map((w) => (
              <p key={w}>
                <AlertCircle size={14} />
                {w}
              </p>
            ))}
          </div>
        </fieldset>
        <div className="post-composer-preview">
          <SocialPostPreview
            api={api}
            provider={provider}
            accountName={channel?.account?.name || "Your account"}
            text={check.text}
            title={draft.composition.title}
            images={selected}
            imageAlts={draft.composition.imageAlts}
            mediaJobId={draft.mediaJobId}
            thumbnail={thumbnail}
            privacy={draft.privacy}
          />
        </div>
      </div>
      {error && (
        <p className="product-message error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="product-message" role="status">
          {message}
        </p>
      )}
      <div className="post-composer-footer">
        <button
          type="button"
          className="button"
          disabled={busy || !loaded || !dirty}
          onClick={() => void act(save)}
        >
          <Save size={14} /> Save post draft
        </button>
        <button
          type="button"
          className="button primary"
          disabled={
            busy ||
            !loaded ||
            !channel?.canPublish ||
            !!check.errors.length ||
            draft.campaignRevision !== campaign.revision
          }
          onClick={() =>
            void act(async () => {
              if (dirty) await save();
              await api("expansion/publishing/prepare", {
                campaignId: campaign.id,
                expectedRevision: campaign.revision,
                provider,
                composition: draft.composition,
                ...(draft.mediaJobId ? { mediaJobId: draft.mediaJobId } : {}),
                ...(provider === "instagram"
                  ? draft.mediaJobId
                    ? { publicMediaUrl: draft.publicMediaUrl }
                    : { publicImageUrls: draft.publicImageUrls }
                  : {}),
                privacy: draft.privacy,
              });
              setMessage(
                "Exact post prepared below. Review it before approving publication.",
              );
              await onPrepared();
            })
          }
        >
          {busy ? "Preparing…" : "Review final post"}
        </button>
        <button
          type="button"
          className="button small"
          disabled={busy || !loaded}
          onClick={() => {
            if (
              !dirty ||
              confirm("Replace these edits with the campaign's approved copy?")
            ) {
              setDraft({ ...initial(), revision: draft.revision });
              setDirty(true);
              setError("");
            }
          }}
        >
          Reset to campaign
        </button>
        <small>
          {channel?.canPublish
            ? "Nothing publishes until you approve the final post."
            : "Preview and save now. Connect this channel to publish."}
        </small>
      </div>
    </>
  );
}
