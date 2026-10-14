import React, { useState, useEffect } from "react";
import type { Creative } from "../expansion-contract";
type API = <T>(route: string, body?: unknown) => Promise<T>;
type Design = {
  svg: string;
  scene: { width: number; height: number; [key: string]: unknown };
};
export function CreatorDesign({
  api,
  creative,
  dirty,
}: {
  api: API;
  creative?: Creative;
  dirty: boolean;
}) {
  const [format, setFormat] = useState<"square" | "wide">("square"),
    [design, setDesign] = useState<Design>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => setDesign(undefined), [creative?.id, creative?.revision]);
  function download(data: Blob, name: string) {
    const href = URL.createObjectURL(data),
      a = document.createElement("a");
    a.href = href;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }
  return (
    <section className="product-intelligence">
      <h3>Design Studio</h3>
      <p>
        Create a branded teaching card from your saved title, copy and color.
        Review the excerpt, export editable SVG/layers, or a real PNG.
      </p>
      <label>
        Design format
        <select
          aria-label="Design format"
          value={format}
          onChange={(e) => {
            setFormat(e.target.value as typeof format);
            setDesign(undefined);
          }}
        >
          <option value="square">Square · 1200×1200</option>
          <option value="wide">Wide · 1200×675</option>
        </select>
      </label>
      <button
        className="button"
        disabled={!creative || dirty || busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            setDesign(
              await api(`expansion/creatives/${creative!.id}/design`, {
                format,
              }),
            );
          } catch (err) {
            setError(err instanceof Error ? err.message : "Design failed.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Compose design preview
      </button>
      {error && <p role="alert">{error}</p>}
      {design && (
        <>
          <img
            className="creator-design-preview"
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(design.svg)}`}
            alt="Branded card preview showing an excerpt of your creative title and copy"
          />
          <div className="product-actions">
            <button
              className="button"
              onClick={() =>
                download(
                  new Blob([design.svg], { type: "image/svg+xml" }),
                  "outclass-design.svg",
                )
              }
            >
              Export editable SVG
            </button>
            <button
              className="button"
              onClick={() =>
                download(
                  new Blob([JSON.stringify(design.scene, null, 2)], {
                    type: "application/json",
                  }),
                  "outclass-design-layers.json",
                )
              }
            >
              Export layers
            </button>
            <button
              className="button"
              onClick={() => {
                const image = new Image();
                image.onload = () => {
                  const canvas = document.createElement("canvas");
                  canvas.width = design.scene.width;
                  canvas.height = design.scene.height;
                  canvas.getContext("2d")!.drawImage(image, 0, 0);
                  canvas.toBlob((blob) => {
                    if (blob) download(blob, "outclass-design.png");
                  }, "image/png");
                };
                image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(design.svg)}`;
              }}
            >
              Export PNG
            </button>
          </div>
        </>
      )}
    </section>
  );
}
