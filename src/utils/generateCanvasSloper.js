const DEFAULT_DPI = 150;
const UNIT_MM = 1; // 1单位 = 1mm

export function unitsToPx(value, dpi = DEFAULT_DPI) {
  return value * dpi / 25.4; // mm -> px
}

function isRenderableEntity(entity) {
  const supportedTypes = ['LINE', 'CIRCLE', 'ARC', 'POLYLINE', 'LWPOLYLINE', 'SPLINE', 'TEXT'];
  return supportedTypes.includes(entity.type);
}

export function getEntityBounds(entity, strokeWidth = 18) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const halfStroke = strokeWidth / 2 / DEFAULT_DPI * 25.4;

  switch (entity.type) {
    case 'TEXT':
      if (entity.startPoint) {
        minX = entity.startPoint.x - halfStroke;
        minY = entity.startPoint.y - halfStroke;
        maxX = entity.startPoint.x + (entity.textWidth || 50) + halfStroke;
        maxY = entity.startPoint.y + (entity.textHeight || 20) + halfStroke;
      } else return null;
      break;
    case 'LINE':
      if (!entity.vertices || entity.vertices.length < 2) return null;
      minX = Math.min(entity.vertices[0].x, entity.vertices[1].x) - halfStroke;
      minY = Math.min(entity.vertices[0].y, entity.vertices[1].y) - halfStroke;
      maxX = Math.max(entity.vertices[0].x, entity.vertices[1].x) + halfStroke;
      maxY = Math.max(entity.vertices[0].y, entity.vertices[1].y) + halfStroke;
      break;
    case 'CIRCLE':
    case 'ARC':
      if (!entity.center || typeof entity.radius !== 'number') return null;
      minX = entity.center.x - entity.radius - halfStroke;
      minY = entity.center.y - entity.radius - halfStroke;
      maxX = entity.center.x + entity.radius + halfStroke;
      maxY = entity.center.y + entity.radius + halfStroke;
      break;
    case 'POLYLINE':
    case 'LWPOLYLINE':
      if (!entity.vertices || entity.vertices.length === 0) return null;
      entity.vertices.forEach(v => {
        minX = Math.min(minX, v.x - halfStroke);
        minY = Math.min(minY, v.y - halfStroke);
        maxX = Math.max(maxX, v.x + halfStroke);
        maxY = Math.max(maxY, v.y + halfStroke);
      });
      break;
    case 'SPLINE':
      if (!entity.controlPoints || entity.controlPoints.length === 0) return null;
      entity.controlPoints.forEach(p => {
        minX = Math.min(minX, p.x - halfStroke);
        minY = Math.min(minY, p.y - halfStroke);
        maxX = Math.max(maxX, p.x + halfStroke);
        maxY = Math.max(maxY, p.y + halfStroke);
      });
      break;
    default: return null;
  }
  if (minX === Infinity || minY === Infinity || maxX === -Infinity || maxY === -Infinity) return null;
  return { minX, minY, maxX, maxY };
}

// 坐标系角度 -> 北向顺时针角度
function mathToNorthAngle(mathAngle) {
  // // 先归一到 [-360, 360)
  mathAngle = mathAngle % 360;
  // 北向顺时针公式
  let north = mathAngle - 90;
  // 归一化到 [-180, 180)
  while (north > 180) north -= 360;
  while (north <= -180) north += 360;
  return north;
}

function normalizeNorthAngle(a) {
  let r = a % 360;
  if (r > 180) r -= 360;
  if (r <= -180) r += 360;
  return r;
}

export function drawEntity(ctx, entity, scale, offsetX, offsetY, bounds, strokeWidth = 18) {
  const transformX = x => (x - bounds.minX) * scale + offsetX;
  const transformY = y => (bounds.maxY - y) * scale + offsetY;
  const radius = 5 * scale;
  
  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = '#000';
  ctx.beginPath();

  switch (entity.type) {
    case 'TEXT':
      const fontSize = Math.max(12, (entity.textHeight || 5) * scale);
      ctx.font = `${fontSize}px Arial`;
      ctx.textBaseline = 'middle';
      const textX = transformX(entity.startPoint.x);
      const textY = transformY(entity.startPoint.y);
      if (entity.rotation) {
        ctx.save();
        ctx.translate(textX, textY);
        ctx.rotate(-(entity.rotation * Math.PI) / 180);
        ctx.fillText(entity.text || '[空文本]', 0, 0);
        ctx.restore();
      } else ctx.fillText(entity.text || '[空文本]', textX, textY);
      break;
    case 'LINE':
      if (entity.vertices && entity.vertices.length >= 2) {
        ctx.moveTo(transformX(entity.vertices[0].x), transformY(entity.vertices[0].y));
        ctx.lineTo(transformX(entity.vertices[1].x), transformY(entity.vertices[1].y));
      }
      break;
    case 'CIRCLE':
      ctx.arc(transformX(entity.center.x), transformY(entity.center.y), entity.radius * scale, 0, 2 * Math.PI);
      break;
    case 'ARC':
      const startAngle = ((entity.startAngle || 0) * Math.PI) / 180;
      const endAngle = ((entity.endAngle || 0) * Math.PI) / 180;
      ctx.arc(transformX(entity.center.x), transformY(entity.center.y), entity.radius * scale, -endAngle, -startAngle, true);
      break;
    case 'POLYLINE':
    case 'LWPOLYLINE':
      if (!entity.vertices || entity.vertices.length === 0) break;
      const pts = entity.vertices.map(v => ({ x: transformX(v.x), y: transformY(v.y) }));
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const p0 = pts[i - 1];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const v0 = { x: p0.x - p1.x, y: p0.y - p1.y };
        const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
        const len0 = Math.hypot(v0.x, v0.y);
        const len1 = Math.hypot(v1.x, v1.y);
        const r0 = Math.min(radius, len0 / 2);
        const r1 = Math.min(radius, len1 / 2);
        const pA = { x: p1.x + v0.x / len0 * r0, y: p1.y + v0.y / len0 * r0 };
        const pB = { x: p1.x + v1.x / len1 * r1, y: p1.y + v1.y / len1 * r1 };
        ctx.lineTo(pA.x, pA.y);
        ctx.quadraticCurveTo(p1.x, p1.y, pB.x, pB.y);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      if (entity.closed || entity.shape) ctx.closePath();
      break;
    case 'SPLINE':
      ctx.moveTo(transformX(entity.controlPoints[0].x), transformY(entity.controlPoints[0].y));
      for (let i = 1; i < entity.controlPoints.length; i++) {
        ctx.lineTo(transformX(entity.controlPoints[i].x), transformY(entity.controlPoints[i].y));
      }
      break;
  }
  ctx.stroke();
}

function renderEntityToImage(entity) {
  const strokeWidth = 18;
  const bounds = getEntityBounds(entity, strokeWidth);
  if (!bounds) return null;
  const entityWidth = bounds.maxX - bounds.minX;
  const entityHeight = bounds.maxY - bounds.minY;
  if (entityWidth === 0 || entityHeight === 0) return null;
  const widthPx = unitsToPx(entityWidth);
  const heightPx = unitsToPx(entityHeight);
  const scale = widthPx / entityWidth;

  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawEntity(ctx, entity, scale, 0, 0, bounds, strokeWidth);

  return {
    imageUrl: canvas.toDataURL('image/png'),
    position: { 
      x: Math.round(unitsToPx(bounds.minX) * 1000) / 1000, 
      y: Math.round(unitsToPx(bounds.minY) * 1000) / 1000 
    },
    size: { 
      width: Math.round(widthPx * 1000) / 1000, 
      height: Math.round(heightPx * 1000) / 1000 
    },
    rotation: 0
  };
}

function rotatePointAround(p, center, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  const cosA = Math.cos(rad), sinA = Math.sin(rad);
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return {
    x: center.x + dx * cosA - dy * sinA,
    y: center.y + dx * sinA + dy * cosA
  };
}

function rotateEntityCopy(entity, center, angleDeg) {
  if (!entity) return null;
  const copy = JSON.parse(JSON.stringify(entity));
  switch (copy.type) {
    case 'LINE':
    case 'POLYLINE':
    case 'LWPOLYLINE':
      if (copy.vertices) copy.vertices = copy.vertices.map(v => rotatePointAround(v, center, angleDeg));
      break;
    case 'SPLINE':
      if (copy.controlPoints) copy.controlPoints = copy.controlPoints.map(p => rotatePointAround(p, center, angleDeg));
      break;
    case 'CIRCLE':
    case 'ARC':
      if (copy.center) copy.center = rotatePointAround(copy.center, center, angleDeg);
      if (copy.type === 'ARC') {
        copy.startAngle = ((copy.startAngle || 0) + angleDeg) % 360;
        copy.endAngle = ((copy.endAngle || 0) + angleDeg) % 360;
      }
      break;
    case 'TEXT':
      if (copy.startPoint) copy.startPoint = rotatePointAround(copy.startPoint, center, angleDeg);
      copy.rotation = (typeof copy.rotation === 'number' ? copy.rotation : 0) + angleDeg;
      break;
  }
  return copy;
}

export function generateCanvasSloper(json) {
  if (!json || !json.entities || json.entities.length === 0) return [];

  const entities = [];
  const textsRaw = [];

  // 分离文字和实体
  for (let i = 0; i < json.entities.length; i++) {
    const e = json.entities[i];
    if (!e || !e.type) continue;
    if (e.type === 'TEXT') {
      const pos = (e.startPoint && { x: e.startPoint.x, y: e.startPoint.y })
                || (e.position && { x: e.position.x, y: e.position.y })
                || (e.insert && { x: e.insert.x, y: e.insert.y })
                || null;
      textsRaw.push({
        entity: e,
        x: pos ? pos.x : null,
        y: pos ? pos.y : null,
        rotation: typeof e.rotation === 'number' ? mathToNorthAngle(e.rotation) : mathToNorthAngle(e.angle || 0),
        raw: e.text || ''
      });
    } else if (isRenderableEntity(e)) {
      entities.push({ entity: e, index: i });
    }
  }

  const finalResults = [];

  if (textsRaw.length === 0) {
    for (const { entity, index } of entities) {
      const bounds = getEntityBounds(entity);
      if (!bounds) continue;
      const rendered = renderEntityToImage(entity);
      finalResults.push({
        type: entity.type,
        index,
        rotationApplied: 0,
        bounds,
        textsList: [],
        textsMap: {},
        imageUrl: rendered ? rendered.imageUrl : null,
        position: rendered ? rendered.position : null,
        size: rendered ? rendered.size : null
      });
    }
    return finalResults;
  }

  // 工具函数
  const toRad = d => d * Math.PI / 180;

  const meanAngleDeg = angles => {
    if (!angles || angles.length === 0) return 0;
    let sx = 0, sy = 0;
    for (const a of angles) {
      const r = toRad(a);
      sx += Math.cos(r);
      sy += Math.sin(r);
    }
    return normalizeNorthAngle(toDeg(Math.atan2(sy, sx)));
  };

  // 收集实体信息
  const entityInfos = entities.map(({ entity, index }) => {
    const bounds = getEntityBounds(entity);
    if (!bounds) return null;
    const center = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
    return { orig: entity, index, bounds, center };
  }).filter(Boolean);

  // 文本和实体粗匹配（使用原始 bounds）
  const coarseAssociations = new Map();
  textsRaw.forEach((t, ti) => {
    if (t.x == null || t.y == null) return;
    let best = { idx: -1, dist: Infinity };
    entityInfos.forEach((en, ei) => {
      const cx = (en.bounds.minX + en.bounds.maxX) / 2;
      const cy = (en.bounds.minY + en.bounds.maxY) / 2;
      const dx = t.x - cx;
      const dy = t.y - cy;
      const dist = Math.hypot(dx, dy); // 距离中心
      if (dist < best.dist) best = { idx: ei, dist };
    });
    if (best.idx >= 0) {
      const en = entityInfos[best.idx];
      const w = en.bounds.maxX - en.bounds.minX;
      const h = en.bounds.maxY - en.bounds.minY;
      const threshold = Math.max(w, h) * 1.2; // 容差稍大一点
      if (best.dist <= threshold) {
        if (!coarseAssociations.has(best.idx)) coarseAssociations.set(best.idx, []);
        coarseAssociations.get(best.idx).push(ti);
      }
    }
  });

  // 处理每个实体
  for (let ei = 0; ei < entityInfos.length; ei++) {
    const en = entityInfos[ei];
    const candidateTextIndices = coarseAssociations.get(ei) || [];
    const rotations = candidateTextIndices.map(ti => textsRaw[ti].rotation || 0);
    const meanRot = rotations.length ? meanAngleDeg(rotations) : 0;
    const rotateDeg = -meanRot;

    // 旋转实体
    const rotatedEntity = rotateEntityCopy(en.orig, en.center, rotateDeg);
    const rotatedBounds = getEntityBounds(rotatedEntity);
    if (!rotatedBounds) continue;

    // 文字保持原始坐标，不旋转
    const matchedTexts = candidateTextIndices.map(ti => {
      const t = textsRaw[ti];
      const raw = t.raw || '';
      const match = raw.match(/^([^:：]+)\s*[:：]\s*(.+)$/);
      const label = match ? match[1].trim() : 'unknown';
      const value = match ? match[2].trim() : raw;
      return {
        raw,
        label,
        value,
        rotation: t.rotation,
        point: { x: t.x, y: t.y }
      };
    });

    const textsMap = {};
    matchedTexts.forEach(it => { if (!textsMap[it.label]) textsMap[it.label] = []; textsMap[it.label].push(it.value); });

    // 渲染旋转后的实体
    const rendered = renderEntityToImage(rotatedEntity);

    finalResults.push({
      type: en.orig.type,
      index: en.index,
      rotationApplied: meanRot, // 北向顺时针角度
      bounds: rotatedBounds,
      textsList: matchedTexts,
      textsMap,
      imageUrl: rendered ? rendered.imageUrl : null,
      position: rendered ? rendered.position : null,
      size: rendered ? rendered.size : null
    });
  }

  return finalResults;
}


function toDeg(rad) { return rad * 180 / Math.PI; }
