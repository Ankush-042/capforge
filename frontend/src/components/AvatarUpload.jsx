import React, { useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import Avatar from './Avatar.jsx';

/**
 * Choosing a profile picture.
 *
 * RESIZED IN THE BROWSER, BEFORE ANYTHING IS SENT. A phone photo is three to
 * eight megabytes. Uploading that and shrinking it server-side would mean
 * accepting multi-megabyte bodies on a public endpoint, adding an image
 * library, and burning the user's bandwidth on data that gets thrown away.
 * Drawing it onto a 256px canvas first means what leaves the browser is
 * already the final artifact, typically 20 to 60KB.
 *
 * It also CROPS TO A SQUARE from the centre rather than squashing, because
 * every avatar in this product is round and a stretched face is worse than a
 * cropped one.
 *
 * Quality steps down until the result fits the budget. A single fixed quality
 * either wastes space on simple images or blows the limit on busy ones.
 */

const TARGET_PX = 256;
const MAX_BYTES = 120 * 1024;
const QUALITY_STEPS = [0.82, 0.7, 0.6, 0.5, 0.4];

async function fileToSquareDataUrl(file) {
  const bitmap = await createImageBitmap(file);

  // Centre crop to a square before scaling, so nothing is distorted.
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = Math.floor((bitmap.width - side) / 2);
  const sy = Math.floor((bitmap.height - side) / 2);

  const canvas = document.createElement('canvas');
  canvas.width = TARGET_PX;
  canvas.height = TARGET_PX;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, TARGET_PX, TARGET_PX);
  bitmap.close?.();

  // JPEG, not PNG: a photograph as PNG is several times larger for no visible
  // gain at this size.
  for (const q of QUALITY_STEPS) {
    const url = canvas.toDataURL('image/jpeg', q);
    // A data URI is about 4/3 the size of the bytes it encodes.
    if ((url.length * 3) / 4 <= MAX_BYTES) return url;
  }
  return canvas.toDataURL('image/jpeg', 0.35);
}

export default function AvatarUpload({ name, value, onChange, disabled }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // so choosing the same file twice still fires
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('That is not an image file.');
      return;
    }

    setError(null);
    setBusy(true);
    try {
      const dataUrl = await fileToSquareDataUrl(file);
      onChange(dataUrl);
    } catch (err) {
      console.error('Avatar processing failed:', err);
      setError('Could not read that image. Try a different one.');
    }
    setBusy(false);
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <Avatar name={name} src={value} size={72} />

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || busy}
            className="flex items-center gap-1.5 text-[13px] font-medium text-ink-700 hover:text-violet-700 border border-surface-border px-3.5 py-2 rounded-full transition-colors disabled:opacity-50"
          >
            <Camera size={13} />
            {busy ? 'Working…' : value ? 'Change' : 'Add a photo'}
          </button>

          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={disabled || busy}
              className="flex items-center gap-1.5 text-[13px] text-ink-300 hover:text-signal-critical transition-colors disabled:opacity-50"
            >
              <Trash2 size={13} /> Remove
            </button>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      {error ? (
        <p className="text-[12.5px] text-signal-critical mt-2.5">{error}</p>
      ) : (
        <p className="text-[12.5px] text-ink-500 mt-2.5">
          Cropped to a square and shrunk in your browser, so nothing large is uploaded.
        </p>
      )}
    </div>
  );
}
