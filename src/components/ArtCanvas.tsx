import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { hitTestShape, snapToGrid } from '../lib/geometry';
import {
  applyThrow,
  createBodyFromShape,
  impulseSelect,
  integrateBody,
  softCollide,
  shapePathWithFluid,
  velocityFromSamples,
  type FluidBody,
  type FluidSample,
} from '../lib/fluidPhysics';
import type { Shape } from '../types';
import { formatPhysicalLabel, getFormat } from '../lib/canvasFormats';
import './ArtCanvas.css';

type DragMode = 'move' | 'scale' | 'rotate' | 'paint';

type DragState = {
  mode: DragMode;
  shapeId: string | null;
  startX: number;
  startY: number;
  origin: Shape | null;
  children: Array<{ id: string; x: number; y: number }>;
  samples: FluidSample[];
  pointerId: number;
};

export function ArtCanvas() {
  const svgRef = useRef<SVGSVGElement>(null);
  const projectName = useStudioStore((s) => s.projectName);
  const canvas = useStudioStore((s) => s.canvas);
  const grid = useStudioStore((s) => s.grid);
  const shapes = useStudioStore((s) => s.shapes);
  const image = useStudioStore((s) => s.image);
  const selectedIds = useStudioStore((s) => s.selectedIds);
  const tool = useStudioStore((s) => s.tool);
  const timelineTime = useStudioStore((s) => s.timelineTime);
  const timelinePlaying = useStudioStore((s) => s.timelinePlaying);
  const animation = useStudioStore((s) => s.animation);
  const a11y = useStudioStore((s) => s.a11y);
  const select = useStudioStore((s) => s.select);
  const clearSelection = useStudioStore((s) => s.clearSelection);
  const updateShape = useStudioStore((s) => s.updateShape);
  const pushHistory = useStudioStore((s) => s.pushHistory);
  const addBlob = useStudioStore((s) => s.addBlob);
  const booleanSelected = useStudioStore((s) => s.booleanSelected);
  const scheduleAutosave = useStudioStore((s) => s.scheduleAutosave);

  const bodiesRef = useRef<Map<string, FluidBody>>(new Map());
  const dragRef = useRef<DragState | null>(null);
  const historyPushed = useRef(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tick, setTick] = useState(0);
  const [paintGhost, setPaintGhost] = useState<{
    x: number;
    y: number;
    ox: number;
    oy: number;
  } | null>(null);
  const timeRef = useRef(0);

  const reduced = a11y.reducedMotion;
  const fluid = !reduced;
  const alive = canvas.alive && !reduced;
  const morphAmp = alive && animation.morph ? canvas.aliveIntensity : 0;
  const driftAmp = alive && animation.drift ? canvas.aliveIntensity : 0;
  const phase = timelinePlaying || alive ? timelineTime : 0;

  // Keep fluid bodies in sync with shape list
  useEffect(() => {
    const map = bodiesRef.current;
    const ids = new Set(shapes.map((s) => s.id));
    for (const id of map.keys()) {
      if (!ids.has(id)) map.delete(id);
    }
    for (const s of shapes) {
      if (s.kind === 'cutout' || s.hidden) continue;
      const existing = map.get(s.id);
      if (!existing) {
        map.set(s.id, createBodyFromShape(s));
      } else {
        // Don't stomp mid-flight unless shape changed externally without physics
        const dragging = dragRef.current?.shapeId === s.id;
        if (!dragging && Math.hypot(existing.vx, existing.vy) < 0.05 && existing.jiggle < 0.05) {
          existing.x = s.x;
          existing.y = s.y;
          existing.width = s.width;
          existing.height = s.height;
          existing.rotation = s.rotation;
        }
        existing.locked = s.locked;
        existing.width = s.width;
        existing.height = s.height;
      }
    }
  }, [shapes]);

  // Physics loop — liquid inertia, soft collisions, jiggle
  useEffect(() => {
    if (!fluid) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(2, (now - last) / 16.67);
      last = now;
      timeRef.current += 0.016 * dt;

      const map = bodiesRef.current;
      const list = [...map.values()].filter((b) => !b.locked);
      let active = false;
      const dragId = dragRef.current?.shapeId;

      // Soft liquid collisions
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          if (list[i].id === dragId || list[j].id === dragId) continue;
          softCollide(list[i], list[j]);
        }
      }

      for (const body of map.values()) {
        if (body.id === dragId && dragRef.current?.mode === 'move') {
          // Still jiggle while held
          body.jiggle = Math.max(body.jiggle, 0.25);
          active = true;
          continue;
        }
        if (integrateBody(body, canvas.width, canvas.height, dt)) {
          active = true;
        }
      }

      if (active || dragRef.current || paintGhost) {
        setTick((t) => (t + 1) % 1_000_000);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [fluid, canvas.width, canvas.height, paintGhost]);

  // Sync settled fluid positions back into project state
  const scheduleSync = useCallback(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      const map = bodiesRef.current;
      for (const [id, body] of map) {
        if (Math.hypot(body.vx, body.vy) > 0.2) continue;
        const sh = useStudioStore.getState().shapes.find((s) => s.id === id);
        if (!sh || sh.locked) continue;
        if (
          Math.abs(sh.x - body.x) > 0.5 ||
          Math.abs(sh.y - body.y) > 0.5 ||
          Math.abs(sh.rotation - body.rotation) > 0.5
        ) {
          updateShape(id, {
            x: body.x,
            y: body.y,
            rotation: body.rotation,
          });
        }
      }
      scheduleAutosave();
    }, 180);
  }, [updateShape, scheduleAutosave]);

  const roots = useMemo(() => {
    const cutouts = new Map<string, Shape[]>();
    const list: Shape[] = [];
    for (const s of shapes) {
      if (s.hidden) continue;
      if (s.parentId && s.booleanOp === 'subtract') {
        const arr = cutouts.get(s.parentId) ?? [];
        arr.push(s);
        cutouts.set(s.parentId, arr);
      } else if (s.kind !== 'cutout') {
        list.push(s);
      }
    }
    return { list, cutouts };
  }, [shapes]);

  const clientToSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  }, []);

  const posOf = (shape: Shape) => {
    const b = bodiesRef.current.get(shape.id);
    return {
      x: b?.x ?? shape.x,
      y: b?.y ?? shape.y,
      rotation: b?.rotation ?? shape.rotation,
    };
  };

  const onPointerDownBg = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    const { x, y } = clientToSvg(e.clientX, e.clientY);
    const sample: FluidSample = { x, y, t: performance.now() };

    // Paint / throw new ink: drag then release to fling a blob
    if (tool === 'blob') {
      historyPushed.current = false;
      dragRef.current = {
        mode: 'paint',
        shapeId: null,
        startX: x,
        startY: y,
        origin: null,
        children: [],
        samples: [sample],
        pointerId: e.pointerId,
      };
      setPaintGhost({ x, y, ox: x, oy: y });
      (e.target as Element).setPointerCapture?.(e.pointerId);
      return;
    }

    const ordered = [...shapes].reverse();
    let hit: Shape | null = null;
    for (const s of ordered) {
      if (s.hidden || s.locked || s.kind === 'cutout') continue;
      const p = posOf(s);
      const testShape = { ...s, x: p.x, y: p.y };
      if (hitTestShape(testShape, x, y, phase)) {
        hit = s;
        break;
      }
    }

    if (hit) {
      const additive = e.shiftKey || e.metaKey;
      select([hit.id], additive);
      const body = bodiesRef.current.get(hit.id);
      if (body && fluid) impulseSelect(body);

      if (tool === 'subtract' || tool === 'union') return;

      if (tool === 'select' || tool === 'hand') {
        historyPushed.current = false;
        const p = posOf(hit);
        if (body) {
          body.vx = 0;
          body.vy = 0;
          body.x = p.x;
          body.y = p.y;
        }
        dragRef.current = {
          mode: 'move',
          shapeId: hit.id,
          startX: x,
          startY: y,
          origin: { ...hit, x: p.x, y: p.y, rotation: p.rotation },
          children: shapes
            .filter((s) => s.parentId === hit!.id)
            .map((s) => ({ id: s.id, x: s.x, y: s.y })),
          samples: [sample],
          pointerId: e.pointerId,
        };
        (e.target as Element).setPointerCapture?.(e.pointerId);
      }
    } else {
      clearSelection();
    }
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const { x, y } = clientToSvg(e.clientX, e.clientY);
    drag.samples.push({ x, y, t: performance.now() });
    if (drag.samples.length > 12) drag.samples.shift();

    if (drag.mode === 'paint') {
      setPaintGhost({ x, y, ox: drag.startX, oy: drag.startY });
      return;
    }

    if (!historyPushed.current) {
      pushHistory();
      historyPushed.current = true;
    }

    const o = drag.origin;
    if (!o || !drag.shapeId) return;
    const dx = x - drag.startX;
    const dy = y - drag.startY;

    if (drag.mode === 'move') {
      let nx = o.x + dx;
      let ny = o.y + dy;
      // Fluid freeform by default; snap only when not freeform + snap on
      if (grid.snap && !canvas.freeform && !fluid) {
        nx = snapToGrid(nx, grid.spacing);
        ny = snapToGrid(ny, grid.spacing);
      }
      const body = bodiesRef.current.get(drag.shapeId);
      if (body) {
        // Follow finger with soft lag feel via direct set + trail velocity
        body.x = nx;
        body.y = ny;
        const v = velocityFromSamples(drag.samples);
        body.vx = v.vx * 0.35;
        body.vy = v.vy * 0.35;
        body.jiggle = Math.max(body.jiggle, 0.35 + Math.hypot(v.vx, v.vy) * 0.02);
      } else {
        updateShape(drag.shapeId, { x: nx, y: ny });
      }
      const pdx = nx - o.x;
      const pdy = ny - o.y;
      for (const child of drag.children) {
        updateShape(child.id, { x: child.x + pdx, y: child.y + pdy });
      }
    } else if (drag.mode === 'scale') {
      const nw = Math.max(32, o.width + dx);
      const nh = Math.max(32, o.height + dy);
      updateShape(drag.shapeId, { width: nw, height: nh });
      const body = bodiesRef.current.get(drag.shapeId);
      if (body) {
        body.width = nw;
        body.height = nh;
        body.jiggle = Math.max(body.jiggle, 0.4);
      }
    } else if (drag.mode === 'rotate') {
      const cx = o.x + o.width / 2;
      const cy = o.y + o.height / 2;
      const ang = (Math.atan2(y - cy, x - cx) * 180) / Math.PI;
      updateShape(drag.shapeId, { rotation: ang + 90 });
      const body = bodiesRef.current.get(drag.shapeId);
      if (body) body.rotation = ang + 90;
    }
    setTick((t) => t + 1);
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    if (!drag) return;

    if (drag.mode === 'paint') {
      const v = velocityFromSamples(drag.samples);
      const speed = Math.hypot(v.vx, v.vy);
      const dropX = paintGhost?.x ?? drag.startX;
      const dropY = paintGhost?.y ?? drag.startY;
      // Sling from origin: if dragged, place at end and throw along flick
      pushHistory();
      addBlob(dropX, dropY);
      // Newly added shape is selected last
      const state = useStudioStore.getState();
      const id = state.selectedIds[0];
      if (id && fluid) {
        let body = bodiesRef.current.get(id);
        if (!body) {
          const sh = state.shapes.find((s) => s.id === id);
          if (sh) {
            body = createBodyFromShape(sh);
            bodiesRef.current.set(id, body);
          }
        }
        if (body) {
          // Throw in flick direction; small drag still “drops” paint softly
          const throwScale = speed > 1.2 ? 1 : 0.35;
          applyThrow(body, v.vx * throwScale, v.vy * throwScale);
          if (speed < 0.8) {
            body.jiggle = Math.max(body.jiggle, 0.65);
          }
        }
      }
      setPaintGhost(null);
      scheduleSync();
      dragRef.current = null;
      historyPushed.current = false;
      return;
    }

    if (drag.mode === 'move' && drag.shapeId && fluid) {
      const body = bodiesRef.current.get(drag.shapeId);
      if (body) {
        const v = velocityFromSamples(drag.samples);
        applyThrow(body, v.vx, v.vy);
      }
      scheduleSync();
    } else {
      scheduleAutosave();
    }

    if (tool === 'subtract' && selectedIds.length >= 2) booleanSelected('subtract');
    if (tool === 'union' && selectedIds.length >= 2) booleanSelected('union');

    dragRef.current = null;
    historyPushed.current = false;
    setTick((t) => t + 1);
  };

  const startHandle = (
    e: ReactPointerEvent,
    shapeId: string,
    mode: 'scale' | 'rotate',
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const shape = shapes.find((s) => s.id === shapeId);
    if (!shape || shape.locked) return;
    const { x, y } = clientToSvg(e.clientX, e.clientY);
    const p = posOf(shape);
    historyPushed.current = false;
    dragRef.current = {
      mode,
      shapeId,
      startX: x,
      startY: y,
      origin: { ...shape, x: p.x, y: p.y, rotation: p.rotation },
      children: [],
      samples: [{ x, y, t: performance.now() }],
      pointerId: e.pointerId,
    };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!selectedIds.length) return;
      const step = e.shiftKey ? 10 : 1;
      const gridStep = grid.snap && !canvas.freeform ? grid.spacing : step;
      let dx = 0;
      let dy = 0;
      if (e.key === 'ArrowLeft') dx = -gridStep;
      if (e.key === 'ArrowRight') dx = gridStep;
      if (e.key === 'ArrowUp') dy = -gridStep;
      if (e.key === 'ArrowDown') dy = gridStep;
      if (dx || dy) {
        e.preventDefault();
        pushHistory();
        for (const id of selectedIds) {
          const sh = shapes.find((s) => s.id === id);
          if (!sh || sh.locked) continue;
          const body = bodiesRef.current.get(id);
          if (body) {
            body.x += dx;
            body.y += dy;
            body.jiggle = Math.max(body.jiggle, 0.3);
            updateShape(id, { x: body.x, y: body.y });
          } else {
            updateShape(id, { x: sh.x + dx, y: sh.y + dy });
          }
          for (const child of shapes.filter((s) => s.parentId === id)) {
            updateShape(child.id, { x: child.x + dx, y: child.y + dy });
          }
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIds, shapes, grid, canvas.freeform, pushHistory, updateShape]);

  const spacing = grid.spacing;
  const shimmer =
    alive && animation.gridShimmer
      ? 0.08 + Math.sin(phase * Math.PI * 2) * 0.05
      : grid.visible
        ? grid.opacity
        : 0;

  // tick forces re-render while fluid moves
  void tick;
  const t = timeRef.current;
  const physical = formatPhysicalLabel(canvas.formatId, canvas.orientation);
  const format = getFormat(canvas.formatId);
  const orientLabel =
    canvas.orientation === 'portrait'
      ? 'Portrait'
      : canvas.orientation === 'landscape'
        ? 'Landscape'
        : 'Square';

  return (
    <div className={`art-canvas-frame is-${canvas.orientation}`} role="region" aria-label="Art canvas">
      <p className="canvas-hint micro" id="canvas-hint">
        {fluid
          ? 'Throw · select · fling ink — blobs move like liquid paint'
          : 'Select and edit forms on the canvas'}
      </p>
      <p className="canvas-format-badge micro" aria-live="polite">
        {orientLabel} · {format.label}
        {format.note ? ` · ${format.note}` : ''} · {physical}
      </p>
      <div
        className="art-canvas-surface"
        style={{
          aspectRatio: `${canvas.width} / ${canvas.height}`,
        }}
      >
      <svg
        ref={svgRef}
        className={`art-canvas ${fluid ? 'is-fluid' : ''}`}
        viewBox={`0 0 ${canvas.width} ${canvas.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`${projectName} abstract composition`}
        aria-describedby="canvas-hint"
        onPointerDown={onPointerDownBg}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <defs>
          <filter id="liquid-soft" x="-8%" y="-8%" width="116%" height="116%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" result="b" />
            <feColorMatrix
              in="b"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" mode="normal" />
          </filter>
          <pattern
            id="atelier-grid"
            width={spacing}
            height={spacing}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${spacing} 0 L 0 0 0 ${spacing}`}
              fill="none"
              stroke={`rgba(26,26,26,${shimmer})`}
              strokeWidth="1"
            />
          </pattern>
          {roots.list.map((s) => {
            const cutouts = roots.cutouts.get(s.id) ?? [];
            if (!cutouts.length) return null;
            const body = bodiesRef.current.get(s.id);
            return (
              <mask id={`mask-${s.id}`} key={`mask-${s.id}`}>
                <rect
                  width={body?.width ?? s.width}
                  height={body?.height ?? s.height}
                  fill="white"
                />
                {cutouts.map((c) => {
                  const d = shapePathWithFluid(
                    { ...c, x: 0, y: 0 },
                    undefined,
                    t,
                    phase,
                    morphAmp * 0.8,
                    canvas.softness,
                  );
                  return (
                    <path
                      key={c.id}
                      d={d}
                      fill="black"
                      transform={`translate(${c.x - (body?.x ?? s.x)} ${c.y - (body?.y ?? s.y)}) rotate(${c.rotation} ${c.width / 2} ${c.height / 2})`}
                    />
                  );
                })}
              </mask>
            );
          })}
        </defs>

        <rect width={canvas.width} height={canvas.height} fill={canvas.background} />
        {grid.visible && (
          <rect width={canvas.width} height={canvas.height} fill="url(#atelier-grid)" />
        )}

        {image && image.role !== 'mask' && (
          <image
            href={image.dataUrl}
            x={image.x}
            y={image.y}
            width={image.width * image.scale}
            height={image.height * image.scale}
            opacity={image.opacity}
            style={{ mixBlendMode: image.blendMode as never }}
            transform={`rotate(${image.rotation} ${image.x + (image.width * image.scale) / 2} ${image.y + (image.height * image.scale) / 2})`}
            preserveAspectRatio="xMidYMid meet"
          />
        )}

        <g className="ink-layer" filter={fluid ? 'url(#liquid-soft)' : undefined}>
          {roots.list.map((s, idx) => {
            const body = bodiesRef.current.get(s.id);
            const d = shapePathWithFluid(
              s,
              body,
              t,
              phase,
              morphAmp,
              canvas.softness,
            );
            const bx = body?.x ?? s.x;
            const by = body?.y ?? s.y;
            const rot = body?.rotation ?? s.rotation;
            const w = body?.width ?? s.width;
            const h = body?.height ?? s.height;
            const driftX =
              driftAmp > 0 ? Math.sin(phase * Math.PI * 2 + idx) * 3 * driftAmp : 0;
            const driftY =
              driftAmp > 0
                ? Math.cos(phase * Math.PI * 2 + idx * 0.7) * 2.5 * driftAmp
                : 0;
            const selected = selectedIds.includes(s.id);
            const cutouts = roots.cutouts.get(s.id) ?? [];
            const speed = body ? Math.hypot(body.vx, body.vy) : 0;

            return (
              <g
                key={s.id}
                className={`ink-blob ${selected ? 'is-selected' : ''} ${speed > 0.5 ? 'is-flowing' : ''}`}
                transform={`translate(${bx + driftX} ${by + driftY}) rotate(${rot} ${w / 2} ${h / 2})`}
                style={{ cursor: s.locked ? 'default' : 'grab' }}
              >
                <path
                  d={d}
                  fill={s.fill}
                  opacity={s.opacity * (0.85 + canvas.contrast * 0.15)}
                  mask={cutouts.length ? `url(#mask-${s.id})` : undefined}
                />
                {selected && !s.locked && (
                  <>
                    <rect
                      className="select-ring"
                      x={-4}
                      y={-4}
                      width={w + 8}
                      height={h + 8}
                      fill="none"
                      stroke="#2a5a8a"
                      strokeWidth="1.25"
                      strokeDasharray="5 4"
                      opacity={0.75}
                      pointerEvents="none"
                      rx={Math.min(w, h) * 0.2}
                    />
                    <circle
                      className="handle"
                      cx={w}
                      cy={h}
                      r={9}
                      onPointerDown={(ev) => startHandle(ev, s.id, 'scale')}
                      aria-label="Scale handle"
                    />
                    <circle
                      className="handle rotate"
                      cx={w / 2}
                      cy={-18}
                      r={8}
                      onPointerDown={(ev) => startHandle(ev, s.id, 'rotate')}
                      aria-label="Rotate handle"
                    />
                  </>
                )}
              </g>
            );
          })}
        </g>

        {/* Paint sling preview */}
        {paintGhost && (
          <g className="paint-ghost" pointerEvents="none">
            <line
              x1={paintGhost.ox}
              y1={paintGhost.oy}
              x2={paintGhost.x}
              y2={paintGhost.y}
              stroke="rgba(26,26,26,0.28)"
              strokeWidth="1.5"
              strokeDasharray="4 5"
            />
            <circle
              cx={paintGhost.ox}
              cy={paintGhost.oy}
              r={6}
              fill="none"
              stroke="rgba(26,26,26,0.25)"
            />
            <ellipse
              cx={paintGhost.x}
              cy={paintGhost.y}
              rx={28}
              ry={22}
              fill="rgba(26,26,26,0.12)"
              stroke="rgba(26,26,26,0.35)"
              strokeWidth="1"
            />
          </g>
        )}
      </svg>
      </div>
      <div className="canvas-caption" aria-hidden="true">
        <span className="micro">Composition · {orientLabel}</span>
        <span className="canvas-caption-title">{projectName}</span>
        <span className="canvas-caption-size">{physical}</span>
      </div>
    </div>
  );
}
