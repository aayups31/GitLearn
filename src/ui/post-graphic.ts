// This only rasterizes OutClass's escaped, source-grounded SVG design response.
export async function postGraphic(svg: string, name: string) {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context)
      throw Error("Image preparation is unavailable in this browser.");
    context.drawImage(image, 0, 0);
    const bytes = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(Error("Could not prepare the graphic.")),
        "image/png",
      ),
    );
    return new File([bytes], name, { type: "image/png" });
  } finally {
    URL.revokeObjectURL(url);
  }
}
