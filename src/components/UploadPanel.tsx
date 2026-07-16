import { useCallback, useRef, useState, type DragEvent } from 'react';
import { nanoid } from 'nanoid';
import { useStudioStore } from '../store/useStudioStore';
import type { BlendMode, ImageRole } from '../types';
import { Icons } from './icons';
import './SidePanel.css';

const ROLES: { id: ImageRole; label: string }[] = [
  { id: 'reference', label: 'Reference' },
  { id: 'trace', label: 'Trace guide' },
  { id: 'texture', label: 'Texture' },
  { id: 'mask', label: 'Mask' },
];

const BLENDS: BlendMode[] = ['normal', 'multiply', 'screen', 'overlay', 'soft-light', 'difference'];

export function UploadPanel() {
  const activePanel = useStudioStore((s) => s.activePanel);
  const image = useStudioStore((s) => s.image);
  const setImage = useStudioStore((s) => s.setImage);
  const updateImage = useStudioStore((s) => s.updateImage);
  const generateFromImage = useStudioStore((s) => s.generateFromImage);
  const setPanel = useStudioStore((s) => s.setPanel);
  const toast = useStudioStore((s) => s.toast);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast('Please upload an image file');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result);
        const img = new Image();
        img.onload = () => {
          const maxDim = 480;
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          setImage({
            id: nanoid(8),
            name: file.name,
            dataUrl,
            width: img.width,
            height: img.height,
            role: 'trace',
            opacity: 0.35,
            blendMode: 'multiply',
            threshold: 0.55,
            blur: 1,
            posterize: 4,
            influence: 0.75,
            x: 40,
            y: 60,
            scale: scale * 0.9,
            rotation: 0,
          });
          toast('Image ready - adjust influence, then generate');
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    },
    [setImage, toast],
  );

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  if (activePanel !== 'upload') return null;

  return (
    <aside className="side-panel panel-scroll" aria-label="Image upload">
      <div className="side-panel-header">
        <p className="section-label">Upload</p>
        <button type="button" className="btn btn-icon" aria-label="Close upload" onClick={() => setPanel(null)}>
          <Icons.close />
        </button>
      </div>

      <div
        className={`dropzone ${dragging ? 'is-dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click();
        }}
        aria-label="Upload image by drop or click"
      >
        <Icons.upload />
        <p>Drop an image, or click to browse</p>
        <span className="micro">PNG · JPG · WebP</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </div>

      {image && (
        <>
          <div className="upload-preview">
            <img src={image.dataUrl} alt={`Uploaded ${image.name}`} />
            <p className="upload-name">{image.name}</p>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="image-role">
              Role
            </label>
            <select
              id="image-role"
              className="select"
              value={image.role}
              onChange={(e) => updateImage({ role: e.target.value as ImageRole })}
            >
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="image-blend">
              Blend mode
            </label>
            <select
              id="image-blend"
              className="select"
              value={image.blendMode}
              onChange={(e) => updateImage({ blendMode: e.target.value as BlendMode })}
            >
              {BLENDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <Slider label="Opacity" value={image.opacity} min={0} max={1} step={0.05} onChange={(v) => updateImage({ opacity: v })} />
          <Slider label="Threshold" value={image.threshold} min={0.15} max={0.9} step={0.05} onChange={(v) => updateImage({ threshold: v })} />
          <Slider label="Blur" value={image.blur} min={0} max={8} step={0.5} onChange={(v) => updateImage({ blur: v })} />
          <Slider label="Posterize" value={image.posterize} min={2} max={8} step={1} onChange={(v) => updateImage({ posterize: v })} />
          <Slider label="Influence" value={image.influence} min={0.2} max={1} step={0.05} onChange={(v) => updateImage({ influence: v })} />

          <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={() => void generateFromImage()}>
            <Icons.spark />
            Generate from image
          </button>
          <button type="button" className="btn btn-ghost" style={{ width: '100%' }} onClick={() => setImage(null)}>
            Remove image
          </button>
        </>
      )}
    </aside>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="field">
      <div className="field-row">
        <span className="field-label">{label}</span>
        <span className="field-value">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
