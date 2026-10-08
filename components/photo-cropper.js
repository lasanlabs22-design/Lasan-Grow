"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "./ui";

// Ported from Lasan People Pro (components/photo-cropper.js) so both products crop photos the same way.

const FRAME = 280; // on-screen size of the square crop area, in CSS pixels
const MAX_ZOOM = 4;
// Where a tall photo starts: this share of the way down its extra height. Heads sit near the top of
// most portraits, so starting near the top keeps them in the circle.
const START_FROM_TOP = 0.12;
export const PHOTO_PX = 320;

/**
 * Lets someone position a photo inside a round frame before it's saved: drag to move, the slider or
 * mouse wheel to zoom. The photo always covers the whole frame, so there's never an empty edge.
 * Calls onCrop(bitmap, { sx, sy, size }) with the chosen square in the photo's own pixels.
 */
export function PhotoCropper({ file, onCancel, onCrop, busy }) {
  const [img, setImg] = useState(null); // { url, bitmap, w, h }
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // top-left of the photo, relative to the frame
  const drag = useRef(null);

  useEffect(() => {
    let alive = true;
    const url = URL.createObjectURL(file);
    createImageBitmap(file).then((bitmap) => {
      if (!alive) return bitmap.close?.();
      const s = FRAME / Math.min(bitmap.width, bitmap.height);
      setImg({ url, bitmap, w: bitmap.width, h: bitmap.height });
      setZoom(1);
      // Start centred across and near the top, where faces usually are.
      setPos({ x: (FRAME - bitmap.width * s) / 2, y: Math.min(0, (FRAME - bitmap.height * s) * START_FROM_TOP) });
    });
    return () => {
      alive = false;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => () => img?.bitmap.close?.(), [img]);

  if (!img) return <div className="grid h-[360px] place-items-center text-sm text-ink-3">Opening photo…</div>;

  const scaleAt = (z) => (FRAME / Math.min(img.w, img.h)) * z;
  const scale = scaleAt(zoom);
  const clamp = (p, s) => ({
    x: Math.min(0, Math.max(FRAME - img.w * s, p.x)),
    y: Math.min(0, Math.max(FRAME - img.h * s, p.y)),
  });

  // Zoom around the centre of the frame, so the face you've lined up stays put.
  function zoomTo(next) {
    const z = Math.min(MAX_ZOOM, Math.max(1, next));
    const from = scaleAt(zoom);
    const to = scaleAt(z);
    const fx = (FRAME / 2 - pos.x) / from;
    const fy = (FRAME / 2 - pos.y) / from;
    setZoom(z);
    setPos(clamp({ x: FRAME / 2 - fx * to, y: FRAME / 2 - fy * to }, to));
  }

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, start: pos };
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const { x, y, start } = drag.current;
    setPos(clamp({ x: start.x + e.clientX - x, y: start.y + e.clientY - y }, scale));
  };
  const onPointerUp = () => {
    drag.current = null;
  };
  const onKeyDown = (e) => {
    const step = e.shiftKey ? 20 : 5;
    // The photo moves the way the arrow points, as it does when dragged.
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[e.key]) {
      e.preventDefault();
      setPos(clamp({ x: pos.x + moves[e.key][0], y: pos.y + moves[e.key][1] }, scale));
    } else if (e.key === "+" || e.key === "=") zoomTo(zoom + 0.1);
    else if (e.key === "-") zoomTo(zoom - 0.1);
  };

  const reset = () => {
    const s = scaleAt(1);
    setZoom(1);
    setPos({ x: (FRAME - img.w * s) / 2, y: Math.min(0, (FRAME - img.h * s) * START_FROM_TOP) });
  };

  const confirm = () => onCrop(img.bitmap, { sx: -pos.x / scale, sy: -pos.y / scale, size: FRAME / scale });

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        role="application"
        aria-label="Photo position. Drag, or use the arrow keys, to move it; plus and minus to zoom."
        tabIndex={0}
        className="relative cursor-grab touch-none select-none overflow-hidden rounded-md bg-black outline-none focus-visible:shadow-[0_0_0_2px_var(--brand)] active:cursor-grabbing"
        style={{ width: FRAME, height: FRAME }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={(e) => zoomTo(zoom - e.deltaY * 0.0015)}
        onKeyDown={onKeyDown}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a local blob preview */}
        <img
          src={img.url}
          alt=""
          draggable={false}
          className="pointer-events-none absolute left-0 top-0 max-w-none"
          style={{ width: img.w * scale, height: img.h * scale, transform: `translate(${pos.x}px, ${pos.y}px)` }}
        />
        {/* Darken everything outside the circle that will be saved. */}
        <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgb(0_0_0/0.55)] ring-2 ring-white/80" />
      </div>

      <div className="flex w-full max-w-[280px] items-center gap-2">
        <Button type="button" variant="ghost" size="icon" onClick={() => zoomTo(zoom - 0.2)} aria-label="Zoom out">
          <Minus size={15} />
        </Button>
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(e) => zoomTo(Number(e.target.value))}
          aria-label="Zoom"
          className="flex-1 accent-[var(--brand)]"
        />
        <Button type="button" variant="ghost" size="icon" onClick={() => zoomTo(zoom + 0.2)} aria-label="Zoom in">
          <Plus size={15} />
        </Button>
      </div>
      <p className="-mt-2 text-xs text-ink-3">Drag to position your face inside the circle, then zoom to fit.</p>

      <div className="flex w-full items-center justify-between gap-2 border-t border-line pt-4">
        <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={busy}>
          <RotateCcw size={13} /> Reset
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={confirm} disabled={busy}>
            {busy ? "Saving…" : "Use photo"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Draws the square chosen in the cropper and re-encodes it small enough to upload. */
export function toPhotoDataUrl(bitmap, { sx, sy, size }) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = PHOTO_PX;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, PHOTO_PX, PHOTO_PX);
  for (const q of [0.85, 0.7, 0.55]) {
    const url = canvas.toDataURL("image/jpeg", q);
    if (url.length < 150_000) return url;
  }
  throw new Error("That image is too detailed to compress. Try a different photo.");
}
