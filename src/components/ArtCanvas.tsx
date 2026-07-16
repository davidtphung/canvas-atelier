import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { hitTestShape, shapeToPath, snapToGrid } from '../lib/geometry';
import type { Shape } from '../types';
import './ArtCanvas.css';

type DragMode = 'move' | 'scale' | 'rotate';

type DragState = {
  mode: DragMode;
  shapeId: string;
  startX: number;
  startY: number;
  origin: Shape;
  /** Snapshot of cutout children at drag start */
  children: Array<{ id: string; x: number; y: number }>;
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

  const [drag, setDrag] = useState<DragState | null>(null);
  const historyPushed = useRef(false);

  const alive = canvas.alive && !a11y.reducedMotion;
  const morphAmp = alive && animation.morph ? canvas.aliveIntensity : 0;
  const driftAmp = alive && animation.drift ? canvas.aliveIntensity : 0;
  const phase = timelinePlaying || alive ? timelineTime : 0;

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

  const beginDrag = (
    mode: DragMode,
    shape: Shape,
    x: number,
    y: number,
    target: Element,
    pointerId: number,
  ) => {
    historyPushed.current = false;
    const children = shapes
      .filter((s) => s.parentId === shape.id)
      .map((s) => ({ id: s.id, x: s.x, y: s.y }));
    setDrag({
      mode,
      shapeId: shape.id,
      startX: x,
      startY: y,
      origin: { ...shape },
      children,
    });
    target.setPointerCapture?.(pointerId);
  };

  const onPointerDownBg = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    const { x, y } = clientToSvg(e.clientX, e.clientY);

    if (tool === 'blob') {
      addBlob(x, y);
      return;
    }

    const ordered = [...shapes].reverse();
    let hit: Shape | null = null;
    for (const s of ordered) {
      if (s.hidden || s.locked || s.kind === 'cutout') continue;
      if (hitTestShape(s, x, y, phase)) {
        hit = s;
        break;
      }
    }

    if (hit) {
      const additive = e.shiftKey || e.metaKey;
      select([hit.id], additive);
      if (tool === 'subtract' || tool === 'union') {
        return;
      }
      if (tool === 'select' || tool === 'hand') {
        beginDrag('move', hit, x, y, e.target as Element, e.pointerId);
      }
    } else {
      clearSelection();
    }
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!drag) return;
    if (!historyPushed.current) {
      pushHistory();
      historyPushed.current = true;
    }
    const { x, y } = clientToSvg(e.clientX, e.clientY);
    const dx = x - drag.startX;
    const dy = y - drag.startY;
    const o = drag.origin;

    if (drag.mode === 'move') {
      let nx = o.x + dx;
      let ny = o.y + dy;
      if (grid.snap && !canvas.freeform) {
        nx = snapToGrid(nx, grid.spacing);
        ny = snapToGrid(ny, grid.spacing);
      }
      const pdx = nx - o.x;
      const pdy = ny - o.y;
      updateShape(drag.shapeId, { x: nx, y: ny });
      for (const child of drag.children) {
        updateShape(child.id, { x: child.x + pdx, y: child.y + pdy });
      }
    } else if (drag.mode === 'scale') {
      const nw = Math.max(32, o.width + dx);
      const nh = Math.max(32, o.height + dy);
      updateShape(drag.shapeId, { width: nw, height: nh });
    } else if (drag.mode === 'rotate') {
      const cx = o.x + o.width / 2;
      const cy = o.y + o.height / 2;
      const ang = (Math.atan2(y - cy, x - cx) * 180) / Math.PI;
      updateShape(drag.shapeId, { rotation: ang + 90 });
    }
  };

  const onPointerUp = () => {
    if (drag) {
      scheduleAutosave();
      if (tool === 'subtract' && selectedIds.length >= 2) booleanSelected('subtract');
      if (tool === 'union' && selectedIds.length >= 2) booleanSelected('union');
    }
    setDrag(null);
    historyPushed.current = false;
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
    beginDrag(mode, shape, x, y, e.currentTarget as Element, e.pointerId);
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
          updateShape(id, { x: sh.x + dx, y: sh.y + dy });
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

  return (
    <div className="art-canvas-frame" role="region" aria-label="Art canvas">
      <svg
        ref={svgRef}
        className="art-canvas"
        viewBox={`0 0 ${canvas.width} ${canvas.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`${projectName} abstract composition`}
        onPointerDown={onPointerDownBg}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <defs>
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
            return (
              <mask id={`mask-${s.id}`} key={`mask-${s.id}`}>
                <rect width={s.width} height={s.height} fill="white" />
                {cutouts.map((c) => {
                  const local: Shape = {
                    ...c,
                    x: 0,
                    y: 0,
                    width: c.width,
                    height: c.height,
                  };
                  const d = shapeToPath(local, phase, morphAmp * 0.8);
                  return (
                    <path
                      key={c.id}
                      d={d}
                      fill="black"
                      transform={`translate(${c.x - s.x} ${c.y - s.y}) rotate(${c.rotation} ${c.width / 2} ${c.height / 2})`}
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

        {roots.list.map((s, idx) => {
          const local: Shape = { ...s, x: 0, y: 0 };
          const d = shapeToPath(local, phase, morphAmp);
          const driftX =
            driftAmp > 0 ? Math.sin(phase * Math.PI * 2 + idx) * 3 * driftAmp : 0;
          const driftY =
            driftAmp > 0 ? Math.cos(phase * Math.PI * 2 + idx * 0.7) * 2.5 * driftAmp : 0;
          const selected = selectedIds.includes(s.id);
          const cutouts = roots.cutouts.get(s.id) ?? [];

          return (
            <g
              key={s.id}
              transform={`translate(${s.x + driftX} ${s.y + driftY}) rotate(${s.rotation} ${s.width / 2} ${s.height / 2})`}
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
                    x={-2}
                    y={-2}
                    width={s.width + 4}
                    height={s.height + 4}
                    fill="none"
                    stroke="#2a5a8a"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    pointerEvents="none"
                  />
                  <circle
                    className="handle"
                    cx={s.width}
                    cy={s.height}
                    r={8}
                    onPointerDown={(ev) => startHandle(ev, s.id, 'scale')}
                    aria-label="Scale handle"
                  />
                  <circle
                    className="handle rotate"
                    cx={s.width / 2}
                    cy={-16}
                    r={7}
                    onPointerDown={(ev) => startHandle(ev, s.id, 'rotate')}
                    aria-label="Rotate handle"
                  />
                </>
              )}
            </g>
          );
        })}
      </svg>
      <div className="canvas-caption" aria-hidden="true">
        <span className="micro">Composition</span>
        <span className="canvas-caption-title">{projectName}</span>
      </div>
    </div>
  );
}
