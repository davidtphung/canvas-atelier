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
  applyProximityField,
  applyThrow,
  applyTrackpadPush,
  beginFingerGrab,
  createBodyFromShape,
  growPuddle,
  impulseSelect,
  integrateBody,
  releaseFingerGrab,
  softCollide,
  shapePathWithFluid,
  updateFingerGrab,
  velocityFromSamples,
  type FluidBody,
  type FluidSample,
} from '../lib/fluidPhysics';
import type { Shape } from '../types';
import { formatPhysicalLabel, getFormat } from '../lib/canvasFormats';
import {
  blobSizeFromPressure,
  dabSpacingFromPressure,
  resolvePaintPressure,
} from '../lib/paintPressure';
import './ArtCanvas.css';

type DragMode =
  | 'move'
  | 'scale'
  | 'rotate'
  | 'paint'
  | 'ink-smear'
  | 'ink-paint';

type DragState = {
  mode: DragMode;
  shapeId: string | null;
  startX: number;
  startY: number;
  origin: Shape | null;
  children: Array<{ id: string; x: number; y: number }>;
  samples: FluidSample[];
  pointerId: number;
  lastSpillX: number;
  lastSpillY: number;
  pointerType: string;
  /** ms pointer has been held (for mouse dwell → heavier press) */
  downAt: number;
  lastPressure: number;
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
  const [fingerCursor, setFingerCursor] = useState<{
    x: number;
    y: number;
    down: boolean;
    /** preview radius in canvas units */
    radius: number;
  } | null>(null);
  const timeRef = useRef(0);
  const hoverRef = useRef<{ x: number; y: number } | null>(null);
  const strokeHistoryPushed = useRef(false);

  const reduced = a11y.reducedMotion;
  const fluid = !reduced;
  const inkMode = tool === 'ink';
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
        const dragging =
          dragRef.current?.shapeId === s.id || existing.fingerTarget != null;
        if (
          !dragging &&
          Math.hypot(existing.vx, existing.vy) < 0.05 &&
          existing.jiggle < 0.05
        ) {
          existing.x = s.x;
          existing.y = s.y;
          existing.width = s.width;
          existing.height = s.height;
          existing.rotation = s.rotation;
        }
        existing.locked = s.locked;
        // Don't shrink puddle mid-smear from store overwrites
        if (!dragging) {
          existing.width = s.width;
          existing.height = s.height;
        }
      }
    }
  }, [shapes]);

  // Physics loop - liquid inertia, finger spring, soft collisions, jiggle
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

      // Soft liquid collisions
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          softCollide(list[i], list[j]);
        }
      }

      // Ambient hover field (cursor / trackpad glide without click)
      const hover = hoverRef.current;
      const drag = dragRef.current;
      if (
        hover &&
        !drag &&
        (tool === 'ink' || tool === 'select' || tool === 'hand') &&
        !reduced
      ) {
        for (const body of list) {
          applyProximityField(body, hover.x, hover.y, tool === 'ink' ? 1.15 : 0.55);
        }
      }

      for (const body of map.values()) {
        if (integrateBody(body, canvas.width, canvas.height, dt)) {
          active = true;
        }
      }

      if (active || drag || paintGhost || fingerCursor) {
        setTick((t) => (t + 1) % 1_000_000);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [fluid, canvas.width, canvas.height, paintGhost, fingerCursor, tool, reduced]);

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

  const hitShapeAt = (x: number, y: number): Shape | null => {
    const ordered = [...shapes].reverse();
    for (const s of ordered) {
      if (s.hidden || s.locked || s.kind === 'cutout') continue;
      const p = posOf(s);
      if (hitTestShape({ ...s, x: p.x, y: p.y }, x, y, phase)) return s;
    }
    return null;
  };

  const ensureBody = (shape: Shape): FluidBody => {
    let body = bodiesRef.current.get(shape.id);
    if (!body) {
      body = createBodyFromShape(shape);
      bodiesRef.current.set(shape.id, body);
    }
    return body;
  };

  /** Place one pressure-sized ink dab (no history push - caller batches stroke) */
  const placePaintDab = (
    x: number,
    y: number,
    pressure: number,
    velocity?: { vx: number; vy: number },
  ) => {
    const { width, height } = blobSizeFromPressure(pressure);
    addBlob(x, y);
    const state = useStudioStore.getState();
    const id = state.selectedIds[0];
    const sh = state.shapes.find((s) => s.id === id);
    if (!sh) return null;
    const body = ensureBody(sh);
    body.width = width;
    body.height = height;
    body.x = x - width / 2;
    body.y = y - height / 2;
    body.jiggle = 0.5 + pressure * 0.5;
    if (velocity) {
      body.vx = velocity.vx * 0.25;
      body.vy = velocity.vy * 0.25;
    }
    updateShape(id, {
      x: body.x,
      y: body.y,
      width: body.width,
      height: body.height,
    });
    return { id, body, width, height };
  };

  const pressureFromEvent = (
    e: ReactPointerEvent,
    samples: FluidSample[],
    downAt: number,
  ): number => {
    const v = velocityFromSamples(samples);
    const speed = Math.hypot(v.vx, v.vy);
    const dwell = Math.min(1, (performance.now() - downAt) / 900);
    // Near-still hold increases “press” for mouse/trackpad
    const dwellBoost = speed < 0.35 ? dwell : dwell * 0.25;
    return resolvePaintPressure({
      pressure: e.pressure,
      pointerType: e.pointerType,
      speed,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      dwell: dwellBoost,
    });
  };

  const onPointerDownBg = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const { x, y } = clientToSvg(e.clientX, e.clientY);
    const sample: FluidSample = { x, y, t: performance.now() };
    const downAt = performance.now();
    hoverRef.current = { x, y };

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
        lastSpillX: x,
        lastSpillY: y,
        pointerType: e.pointerType,
        downAt,
        lastPressure: e.pressure || 0.45,
      };
      setPaintGhost({ x, y, ox: x, oy: y });
      setFingerCursor({ x, y, down: true, radius: 24 });
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      return;
    }

    // Spilled ink - paint with cursor; harder press = larger blob
    if (tool === 'ink') {
      const hit = hitShapeAt(x, y);
      historyPushed.current = false;
      strokeHistoryPushed.current = false;

      // Grab existing puddle only with Alt (smear). Default: paint stroke.
      if (hit && e.altKey) {
        select([hit.id], e.shiftKey || e.metaKey);
        const body = ensureBody(hit);
        const p = posOf(hit);
        body.x = p.x;
        body.y = p.y;
        beginFingerGrab(body, x, y);
        dragRef.current = {
          mode: 'ink-smear',
          shapeId: hit.id,
          startX: x,
          startY: y,
          origin: { ...hit, x: body.x, y: body.y, rotation: body.rotation },
          children: shapes
            .filter((s) => s.parentId === hit.id)
            .map((s) => ({ id: s.id, x: s.x, y: s.y })),
          samples: [sample],
          pointerId: e.pointerId,
          lastSpillX: x,
          lastSpillY: y,
          pointerType: e.pointerType,
          downAt,
          lastPressure: e.pressure || 0.45,
        };
      } else {
        // Continuous paint stroke
        pushHistory();
        strokeHistoryPushed.current = true;
        const pressure = pressureFromEvent(e, [sample], downAt);
        const size = blobSizeFromPressure(pressure);
        const dab = placePaintDab(x, y, pressure);
        setFingerCursor({
          x,
          y,
          down: true,
          radius: size.width / 2,
        });
        dragRef.current = {
          mode: 'ink-paint',
          shapeId: dab?.id ?? null,
          startX: x,
          startY: y,
          origin: null,
          children: [],
          samples: [sample],
          pointerId: e.pointerId,
          lastSpillX: x,
          lastSpillY: y,
          pointerType: e.pointerType,
          downAt,
          lastPressure: pressure,
        };
      }
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      return;
    }

    const hit = hitShapeAt(x, y);

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
          beginFingerGrab(body, x, y);
        }
        dragRef.current = {
          mode: 'move',
          shapeId: hit.id,
          startX: x,
          startY: y,
          origin: { ...hit, x: p.x, y: p.y, rotation: p.rotation },
          children: shapes
            .filter((s) => s.parentId === hit.id)
            .map((s) => ({ id: s.id, x: s.x, y: s.y })),
          samples: [sample],
          pointerId: e.pointerId,
          lastSpillX: x,
          lastSpillY: y,
          pointerType: e.pointerType,
          downAt,
          lastPressure: e.pressure || 0.45,
        };
        setFingerCursor({ x, y, down: true, radius: 16 });
        (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      }
    } else {
      clearSelection();
    }
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const { x, y } = clientToSvg(e.clientX, e.clientY);
    hoverRef.current = { x, y };

    const drag = dragRef.current;

    // Live brush preview size even when not painting
    if (inkMode && !drag) {
      const p = resolvePaintPressure({
        pressure: e.pressure,
        pointerType: e.pointerType,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        dwell: 0,
      });
      const size = blobSizeFromPressure(p);
      setFingerCursor({ x, y, down: e.buttons === 1, radius: size.width / 2 });
    } else if (drag) {
      // update cursor below per-mode
    } else if (tool === 'select' || tool === 'hand') {
      setFingerCursor({ x, y, down: false, radius: 14 });
    }

    if (!drag) return;

    drag.samples.push({ x, y, t: performance.now() });
    if (drag.samples.length > 14) drag.samples.shift();

    if (drag.mode === 'paint') {
      setPaintGhost({ x, y, ox: drag.startX, oy: drag.startY });
      setFingerCursor({ x, y, down: true, radius: 24 });
      return;
    }

    // Continuous paint stroke - deposit dabs; harder press = larger blobs
    if (drag.mode === 'ink-paint') {
      const pressure = pressureFromEvent(e, drag.samples, drag.downAt);
      drag.lastPressure = pressure;
      const size = blobSizeFromPressure(pressure);
      setFingerCursor({ x, y, down: true, radius: size.width / 2 });

      const spacing = dabSpacingFromPressure(pressure);
      const dist = Math.hypot(x - drag.lastSpillX, y - drag.lastSpillY);

      if (dist >= spacing) {
        // Interpolate dabs along the path so fast strokes don't skip
        const steps = Math.max(1, Math.floor(dist / spacing));
        const v = velocityFromSamples(drag.samples);
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          const ix = drag.lastSpillX + (x - drag.lastSpillX) * t;
          const iy = drag.lastSpillY + (y - drag.lastSpillY) * t;
          placePaintDab(ix, iy, pressure, v);
        }
        drag.lastSpillX = x;
        drag.lastSpillY = y;
      } else if (dist < 4) {
        // Holding still: grow the last blob with dwell pressure
        if (drag.shapeId) {
          const body = bodiesRef.current.get(drag.shapeId);
          if (body) {
            const target = blobSizeFromPressure(pressure);
            body.width += (target.width - body.width) * 0.12;
            body.height += (target.height - body.height) * 0.12;
            body.x = x - body.width / 2;
            body.y = y - body.height / 2;
            body.jiggle = Math.max(body.jiggle, 0.4 + pressure * 0.4);
            growPuddle(body, pressure * 0.35);
            updateShape(drag.shapeId, {
              x: body.x,
              y: body.y,
              width: body.width,
              height: body.height,
            });
          }
        }
      }

      setTick((t) => t + 1);
      return;
    }

    // Smear existing puddle (Alt+drag)
    if (drag.mode === 'ink-smear') {
      if (!historyPushed.current) {
        pushHistory();
        historyPushed.current = true;
      }
      if (drag.shapeId) {
        const body = bodiesRef.current.get(drag.shapeId);
        if (body) {
          updateFingerGrab(body, x, y);
          const pressure = pressureFromEvent(e, drag.samples, drag.downAt);
          growPuddle(body, 0.2 + pressure * 0.9);
          const size = blobSizeFromPressure(pressure);
          setFingerCursor({ x, y, down: true, radius: size.width / 2 });
        }
      }
      setTick((t) => t + 1);
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
      const body = bodiesRef.current.get(drag.shapeId);
      if (body && fluid) {
        updateFingerGrab(body, x, y);
      } else {
        let nx = o.x + dx;
        let ny = o.y + dy;
        if (grid.snap && !canvas.freeform) {
          nx = snapToGrid(nx, grid.spacing);
          ny = snapToGrid(ny, grid.spacing);
        }
        updateShape(drag.shapeId, { x: nx, y: ny });
      }
      setFingerCursor({ x, y, down: true, radius: 16 });
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

  const onPointerUp = (e?: ReactPointerEvent) => {
    const drag = dragRef.current;
    if (e) {
      const { x, y } = clientToSvg(e.clientX, e.clientY);
      const p = drag
        ? drag.lastPressure
        : resolvePaintPressure({
            pressure: e.pressure,
            pointerType: e.pointerType,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
          });
      const size = blobSizeFromPressure(p);
      setFingerCursor({ x, y, down: false, radius: size.width / 2 });
    } else {
      setFingerCursor((c) => (c ? { ...c, down: false } : null));
    }

    if (!drag) return;

    if (drag.mode === 'paint') {
      const v = velocityFromSamples(drag.samples);
      const speed = Math.hypot(v.vx, v.vy);
      const dropX = paintGhost?.x ?? drag.startX;
      const dropY = paintGhost?.y ?? drag.startY;
      pushHistory();
      addBlob(dropX, dropY);
      const state = useStudioStore.getState();
      const id = state.selectedIds[0];
      if (id && fluid) {
        const sh = state.shapes.find((s) => s.id === id);
        if (sh) {
          const body = ensureBody(sh);
          const throwScale = speed > 1.2 ? 1 : 0.35;
          applyThrow(body, v.vx * throwScale, v.vy * throwScale);
          if (speed < 0.8) body.jiggle = Math.max(body.jiggle, 0.65);
        }
      }
      setPaintGhost(null);
      scheduleSync();
      dragRef.current = null;
      historyPushed.current = false;
      return;
    }

    if (drag.mode === 'ink-paint') {
      // Soft settle on last dab
      if (drag.shapeId) {
        const body = bodiesRef.current.get(drag.shapeId);
        if (body) {
          body.jiggle = Math.max(body.jiggle, 0.35);
          body.settle = 0.4;
        }
      }
      scheduleSync();
      dragRef.current = null;
      historyPushed.current = false;
      strokeHistoryPushed.current = false;
      setTick((t) => t + 1);
      return;
    }

    if ((drag.mode === 'move' || drag.mode === 'ink-smear') && drag.shapeId && fluid) {
      const body = bodiesRef.current.get(drag.shapeId);
      if (body) {
        releaseFingerGrab(body, drag.samples);
        updateShape(drag.shapeId, {
          x: body.x,
          y: body.y,
          width: body.width,
          height: body.height,
          rotation: body.rotation,
        });
      }
      scheduleSync();
    } else {
      scheduleAutosave();
    }

    if (tool === 'subtract' && selectedIds.length >= 2) booleanSelected('subtract');
    if (tool === 'union' && selectedIds.length >= 2) booleanSelected('union');

    dragRef.current = null;
    historyPushed.current = false;
    strokeHistoryPushed.current = false;
    setTick((t) => t + 1);
  };

  const onPointerLeave = () => {
    if (!dragRef.current) {
      hoverRef.current = null;
      setFingerCursor(null);
    }
  };

  /** Trackpad two-finger scroll / mouse wheel - push ink like a finger swipe */
  const onWheel = (e: React.WheelEvent) => {
    if (reduced || (!inkMode && tool !== 'select' && tool !== 'hand')) return;
    // Don't steal page scroll when user clearly scrolling the document
    // Prefer canvas ink push when over the art surface
    e.preventDefault();
    const { x, y } = clientToSvg(e.clientX, e.clientY);
    hoverRef.current = { x, y };
    const dx = e.deltaX;
    const dy = e.deltaY;
    for (const body of bodiesRef.current.values()) {
      applyTrackpadPush(body, dx, dy, x, y);
    }
    setTick((t) => t + 1);
    scheduleSync();
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
      lastSpillX: x,
      lastSpillY: y,
      pointerType: e.pointerType,
      downAt: performance.now(),
      lastPressure: e.pressure || 0.45,
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
  // 5% darker than base opacity setting
  const gridAlpha = Math.min(1, grid.opacity * 1.05);
  const shimmer =
    alive && animation.gridShimmer
      ? 0.084 + Math.sin(phase * Math.PI * 2) * 0.0525
      : grid.visible
        ? gridAlpha
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

  const hint = reduced
    ? 'Select and edit forms on the canvas'
    : inkMode
      ? 'Paint with cursor - harder press = larger blob · Shift = heavy · Alt+drag = smear · scroll = shove'
      : 'Throw · select · fling ink - blobs move like liquid paint';

  const artRatio = canvas.width / Math.max(1, canvas.height);

  return (
    <div
      className={`art-canvas-frame is-${canvas.orientation}`}
      role="region"
      aria-label="Art canvas"
      style={{ ['--art-ratio' as string]: String(artRatio) }}
    >
      <p className="sr-only" id="canvas-hint">
        {hint}. {orientLabel}, {format.label}, {physical}.
      </p>
      <div className="art-canvas-surface">
      <svg
        ref={svgRef}
        className={`art-canvas ${fluid ? 'is-fluid' : ''} ${inkMode ? 'is-ink-mode' : ''}`}
        viewBox={`0 0 ${canvas.width} ${canvas.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`${projectName} abstract composition`}
        aria-describedby="canvas-hint"
        onPointerDown={onPointerDownBg}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => onPointerUp(e)}
        onPointerCancel={(e) => onPointerUp(e)}
        onPointerLeave={onPointerLeave}
        onPointerEnter={(e) => {
          const { x, y } = clientToSvg(e.clientX, e.clientY);
          hoverRef.current = { x, y };
          setFingerCursor({ x, y, down: false, radius: 20 });
        }}
        onWheel={onWheel}
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
              stroke="currentColor"
              opacity={0.28}
              strokeWidth="1.5"
              strokeDasharray="4 5"
            />
            <circle
              cx={paintGhost.ox}
              cy={paintGhost.oy}
              r={6}
              fill="none"
              stroke="currentColor"
              opacity={0.25}
            />
            <ellipse
              cx={paintGhost.x}
              cy={paintGhost.y}
              rx={28}
              ry={22}
              fill="currentColor"
              opacity={0.12}
              stroke="currentColor"
              strokeOpacity={0.35}
              strokeWidth="1"
            />
          </g>
        )}

        {/* Brush ring - radius matches pressure size */}
        {fingerCursor && fluid && (inkMode || tool === 'select' || tool === 'hand') && (
          <g
            className="finger-cursor"
            pointerEvents="none"
            opacity={fingerCursor.down ? 0.5 : 0.26}
          >
            <circle
              cx={fingerCursor.x}
              cy={fingerCursor.y}
              r={Math.max(8, fingerCursor.radius)}
              fill={fingerCursor.down ? 'currentColor' : 'none'}
              fillOpacity={fingerCursor.down ? 0.08 : 0}
              stroke="currentColor"
              strokeWidth={fingerCursor.down ? 1.75 : 1.2}
              strokeDasharray={fingerCursor.down ? 'none' : '3 4'}
            />
            <circle
              cx={fingerCursor.x}
              cy={fingerCursor.y}
              r={3}
              fill="currentColor"
              opacity={0.45}
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
