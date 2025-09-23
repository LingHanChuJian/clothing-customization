const DEFAULT_DPI = 150;
const UNIT_MM = 1; // 1单位 = 1mm

export function unitsToPx(value, dpi = DEFAULT_DPI) {
  return value * dpi / 25.4; // mm -> px
}

function isRenderableEntity(entity) {
  const supportedTypes = ['LINE', 'CIRCLE', 'ARC', 'POLYLINE', 'LWPOLYLINE', 'SPLINE', 'TEXT', 'INSERT'];
  return supportedTypes.includes(entity.type);
}

/* ---------- helpers ---------- */

// 兼容各种属性命名来拿到插入点
function getInsertPoint(entity) {
  return entity.insert || entity.position || entity.insertPoint || entity.basePoint || { x: 0, y: 0 };
}

// 尝试从 blocks / dxf 中解析出 block 定义（支持 object keyed by name、array、以及常见别名）
function resolveBlock(blocksParam, name, dxf) {
  if (!name) return null;
  let block = null;

  // 1) 如果传入的是 keyed object（最常见），直接取
  if (blocksParam && typeof blocksParam === 'object' && !Array.isArray(blocksParam)) {
    if (blocksParam[name]) block = blocksParam[name];
    else {
      // 大小写不敏感查找 key
      const key = Object.keys(blocksParam).find(k => k.toLowerCase() === name.toLowerCase());
      if (key) block = blocksParam[key];
    }
  }

  // 2) blocksParam 可能是数组
  if (!block && Array.isArray(blocksParam)) {
    block = blocksParam.find(b => b && (b.name === name || String(b.handle) === String(name)));
  }

  // 3) 仍然没找到或 entities 为空时，尝试在 dxf 的 blocks 值数组里搜索实际有 entities 的定义
  if ((!block || !block.entities || block.entities.length === 0) && dxf && dxf.blocks) {
    const vals = Array.isArray(dxf.blocks) ? dxf.blocks : Object.values(dxf.blocks);
    for (const b of vals) {
      if (!b) continue;
      if ((b.name === name || (b.handle && String(b.handle) === String(name)))
          && b.entities && b.entities.length > 0) {
        block = b;
        break;
      }
    }
  }

  // 4) 额外尝试一些常见备用容器（blockRecords / blocksList / blocksArray）
  if ((!block || !block.entities || block.entities.length === 0) && dxf) {
    const candidates = [].concat(dxf.blockRecords || [], dxf.blocksList || [], dxf.blocksArray || []);
    for (const b of candidates) {
      if (!b) continue;
      if ((b.name === name || (b.handle && String(b.handle) === String(name)))
          && b.entities && b.entities.length > 0) {
        block = b;
        break;
      }
    }
  }

  return block;
}

// 旋转点（围绕 center）
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

/* ---------- 主逻辑：bounds / draw / render ---------- */

export function getEntityBounds(entity, strokeWidth = 18, blocks = {}, dxf = null) {
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

    case 'INSERT': {
      // 注意：兼容不同字段命名（name + position/insert）
      const insertName = entity.name;
      const insertPoint = getInsertPoint(entity);
      if (!insertName || !insertPoint) return null;

      // resolve block definition (会尝试用 blocks param, 也会 fallback 到 dxf)
      const block = resolveBlock(blocks, insertName, dxf);
      if (!block) {
        // 没有找到块定义 -> 无法展开（请检查解析器是否把块的几何放入 blocks[name].entities）
        return null;
      }

      // 支持不同命名的 basePoint 字段
      const basePoint = block.basePoint || block.position || block.insert || { x: 0, y: 0 };
      const scaleX = entity.xScale || entity.scaleX || 1;
      const scaleY = entity.yScale || entity.scaleY || 1;
      const rotation = entity.rotation || entity.angle || 0;

      const children = block.entities || [];
      if (!children.length) {
        // block 找到但没有实体 — 无法展开
        return null;
      }

      children.forEach(child => {
        const childCopy = JSON.parse(JSON.stringify(child));

        // 将 child 坐标相对于 block.basePoint 平移到 (0,0)
        const applyBase = p => ({ x: p.x - (basePoint.x || 0), y: p.y - (basePoint.y || 0) });

        if (childCopy.vertices) childCopy.vertices = childCopy.vertices.map(v => applyBase(v));
        if (childCopy.center) childCopy.center = applyBase(childCopy.center);
        if (childCopy.startPoint) childCopy.startPoint = applyBase(childCopy.startPoint);
        if (childCopy.controlPoints) childCopy.controlPoints = childCopy.controlPoints.map(applyBase);

        // 缩放（以原点为基准）
        if (childCopy.vertices) childCopy.vertices = childCopy.vertices.map(v => ({ x: v.x * scaleX, y: v.y * scaleY }));
        if (childCopy.center) {
          childCopy.center = { x: childCopy.center.x * scaleX, y: childCopy.center.y * scaleY };
          if (childCopy.radius) childCopy.radius *= Math.max(scaleX, scaleY);
        }
        if (childCopy.startPoint) childCopy.startPoint = { x: childCopy.startPoint.x * scaleX, y: childCopy.startPoint.y * scaleY };
        if (childCopy.controlPoints) childCopy.controlPoints = childCopy.controlPoints.map(p => ({ x: p.x * scaleX, y: p.y * scaleY }));

        // 旋转（以原点为中心）
        if (rotation) {
          if (childCopy.vertices) childCopy.vertices = childCopy.vertices.map(v => rotatePointAround(v, { x: 0, y: 0 }, rotation));
          if (childCopy.center) childCopy.center = rotatePointAround(childCopy.center, { x: 0, y: 0 }, rotation);
          if (childCopy.startPoint) childCopy.startPoint = rotatePointAround(childCopy.startPoint, { x: 0, y: 0 }, rotation);
          if (childCopy.controlPoints) childCopy.controlPoints = childCopy.controlPoints.map(p => rotatePointAround(p, { x: 0, y: 0 }, rotation));
        }

        // 最后平移到 INSERT 的位置
        if (childCopy.vertices) childCopy.vertices = childCopy.vertices.map(v => ({ x: v.x + (insertPoint.x || 0), y: v.y + (insertPoint.y || 0) }));
        if (childCopy.center) childCopy.center = { x: childCopy.center.x + (insertPoint.x || 0), y: childCopy.center.y + (insertPoint.y || 0) };
        if (childCopy.startPoint) childCopy.startPoint = { x: childCopy.startPoint.x + (insertPoint.x || 0), y: childCopy.startPoint.y + (insertPoint.y || 0) };
        if (childCopy.controlPoints) childCopy.controlPoints = childCopy.controlPoints.map(p => ({ x: p.x + (insertPoint.x || 0), y: p.y + (insertPoint.y || 0) }));

        // 递归拿 bounds
        const childBounds = getEntityBounds(childCopy, strokeWidth, blocks, dxf);
        if (childBounds) {
          minX = Math.min(minX, childBounds.minX);
          minY = Math.min(minY, childBounds.minY);
          maxX = Math.max(maxX, childBounds.maxX);
          maxY = Math.max(maxY, childBounds.maxY);
        }
      });

      break;
    }

    default: return null;
  }

  if (minX === Infinity || minY === Infinity || maxX === -Infinity || maxY === -Infinity) return null;
  return { minX, minY, maxX, maxY };
}

// 坐标系角度 -> 北向顺时针角度
function mathToNorthAngle(mathAngle) {
  mathAngle = mathAngle % 360;
  let north = mathAngle - 90;
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

export function drawEntity(ctx, entity, scale, offsetX, offsetY, bounds, strokeWidth = 18, blocks = {}, dxf = null) {
  const transformX = x => (x - bounds.minX) * scale + offsetX;
  const transformY = y => (bounds.maxY - y) * scale + offsetY;
  const radius = 5 * scale;

  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = '#000';
  ctx.beginPath();

  switch (entity.type) {
    case 'TEXT': {
      const fontSize = Math.max(12, (entity.textHeight || 5) * scale);
      ctx.font = `${fontSize}px Arial`;
      ctx.textBaseline = 'middle';
      const pos = entity.startPoint || entity.position || { x: 0, y: 0 };
      const textX = transformX(pos.x);
      const textY = transformY(pos.y);
      if (entity.rotation) {
        ctx.save();
        ctx.translate(textX, textY);
        ctx.rotate(-(entity.rotation * Math.PI) / 180);
        ctx.fillText(entity.text || '[空文本]', 0, 0);
        ctx.restore();
      } else ctx.fillText(entity.text || '[空文本]', textX, textY);
      break;
    }
    case 'LINE':
      if (entity.vertices && entity.vertices.length >= 2) {
        ctx.moveTo(transformX(entity.vertices[0].x), transformY(entity.vertices[0].y));
        ctx.lineTo(transformX(entity.vertices[1].x), transformY(entity.vertices[1].y));
      }
      break;
    case 'CIRCLE':
      ctx.arc(transformX(entity.center.x), transformY(entity.center.y), entity.radius * scale, 0, 2 * Math.PI);
      break;
    case 'ARC': {
      const startAngle = ((entity.startAngle || 0) * Math.PI) / 180;
      const endAngle = ((entity.endAngle || 0) * Math.PI) / 180;
      ctx.arc(transformX(entity.center.x), transformY(entity.center.y), entity.radius * scale, -endAngle, -startAngle, true);
      break;
    }
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
    case 'INSERT': {
      const insertName = entity.name;
      const insertPoint = getInsertPoint(entity);
      if (!insertName || !insertPoint) break;

      const block = resolveBlock(blocks, insertName, dxf);
      if (!block || !block.entities || block.entities.length === 0) break;

      const basePoint = block.basePoint || block.position || block.insert || { x: 0, y: 0 };
      const scaleX = entity.xScale || entity.scaleX || 1;
      const scaleY = entity.yScale || entity.scaleY || 1;
      const rotation = entity.rotation || entity.angle || 0;

      (block.entities || []).forEach(child => {
        const childCopy = JSON.parse(JSON.stringify(child));
        const applyBase = p => ({ x: p.x - (basePoint.x || 0), y: p.y - (basePoint.y || 0) });

        if (childCopy.vertices) childCopy.vertices = childCopy.vertices.map(v => applyBase(v));
        if (childCopy.center) childCopy.center = applyBase(childCopy.center);
        if (childCopy.startPoint) childCopy.startPoint = applyBase(childCopy.startPoint);
        if (childCopy.controlPoints) childCopy.controlPoints = childCopy.controlPoints.map(applyBase);

        if (childCopy.vertices) childCopy.vertices = childCopy.vertices.map(v => ({ x: v.x * scaleX, y: v.y * scaleY }));
        if (childCopy.center) {
          childCopy.center = { x: childCopy.center.x * scaleX, y: childCopy.center.y * scaleY };
          if (childCopy.radius) childCopy.radius *= Math.max(scaleX, scaleY);
        }
        if (childCopy.startPoint) childCopy.startPoint = { x: childCopy.startPoint.x * scaleX, y: childCopy.startPoint.y * scaleY };
        if (childCopy.controlPoints) childCopy.controlPoints = childCopy.controlPoints.map(p => ({ x: p.x * scaleX, y: p.y * scaleY }));

        if (rotation) {
          if (childCopy.vertices) childCopy.vertices = childCopy.vertices.map(v => rotatePointAround(v, { x: 0, y: 0 }, rotation));
          if (childCopy.center) childCopy.center = rotatePointAround(childCopy.center, { x: 0, y: 0 }, rotation);
          if (childCopy.startPoint) childCopy.startPoint = rotatePointAround(childCopy.startPoint, { x: 0, y: 0 }, rotation);
          if (childCopy.controlPoints) childCopy.controlPoints = childCopy.controlPoints.map(p => rotatePointAround(p, { x: 0, y: 0 }, rotation));
        }

        if (childCopy.vertices) childCopy.vertices = childCopy.vertices.map(v => ({ x: v.x + (insertPoint.x || 0), y: v.y + (insertPoint.y || 0) }));
        if (childCopy.center) childCopy.center = { x: childCopy.center.x + (insertPoint.x || 0), y: childCopy.center.y + (insertPoint.y || 0) };
        if (childCopy.startPoint) childCopy.startPoint = { x: childCopy.startPoint.x + (insertPoint.x || 0), y: childCopy.startPoint.y + (insertPoint.y || 0) };
        if (childCopy.controlPoints) childCopy.controlPoints = childCopy.controlPoints.map(p => ({ x: p.x + (insertPoint.x || 0), y: p.y + (insertPoint.y || 0) }));

        // 递归绘制
        drawEntity(ctx, childCopy, scale, offsetX, offsetY, bounds, strokeWidth, blocks, dxf);
      });

      break;
    }
  }

  ctx.stroke();
}

function renderEntityToImage(entity, strokeWidth = 18, blocks = {}, dxf = null) {
  const bounds = getEntityBounds(entity, strokeWidth, blocks, dxf);
  if (!bounds) return null;
  const entityWidth = bounds.maxX - bounds.minX;
  const entityHeight = bounds.maxY - bounds.minY;
  if (entityWidth === 0 || entityHeight === 0) return null;
  const widthPx = unitsToPx(entityWidth);
  const heightPx = unitsToPx(entityHeight);
  const scale = widthPx / entityWidth;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(widthPx));
  canvas.height = Math.max(1, Math.round(heightPx));
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawEntity(ctx, entity, scale, 0, 0, bounds, strokeWidth, blocks, dxf);

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

export function generateCanvasSloper(dxf) {
  if (!dxf || !dxf.entities || dxf.entities.length === 0) return [];

  const entities = [];
  const textsRaw = [];
  const strokeWidth = 18;
  const blocks = dxf.blocks || {};

  // 分离文字和实体
  for (let i = 0; i < dxf.entities.length; i++) {
    const e = dxf.entities[i];
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

  // 没有文字，直接输出渲染结果
  if (textsRaw.length === 0) {
    for (const { entity, index } of entities) {
      const bounds = getEntityBounds(entity, strokeWidth, blocks, dxf);
      if (!bounds) continue;
      const rendered = renderEntityToImage(entity, strokeWidth, blocks, dxf);
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

  /* ---------- 有文字时的匹配逻辑 ---------- */

  // 工具函数
  const toRad = d => d * Math.PI / 180;
  const toDeg = r => r * 180 / Math.PI;
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

  // 计算点到矩形的最近距离
  function distancePointToRect(px, py, rect) {
    const dx = Math.max(rect.minX - px, 0, px - rect.maxX);
    const dy = Math.max(rect.minY - py, 0, py - rect.maxY);
    return Math.sqrt(dx * dx + dy * dy);
  }

  // 收集实体的几何信息
  const entityInfos = entities.map(({ entity, index }) => {
    const bounds = getEntityBounds(entity, strokeWidth, blocks, dxf);
    return { entity, index, bounds };
  }).filter(e => e.bounds);

  // 为每个文字找最近的实体
  const textMatches = new Map();
  textsRaw.forEach((t, ti) => {
    if (t.x == null || t.y == null) return;
    let best = { idx: -1, dist: Infinity };
    entityInfos.forEach((en, ei) => {
      const d = distancePointToRect(t.x, t.y, en.bounds);
      if (d < best.dist) best = { idx: ei, dist: d };
    });
    if (best.idx >= 0) {
      if (!textMatches.has(best.idx)) textMatches.set(best.idx, []);
      textMatches.get(best.idx).push({ ...t, textIndex: ti });
    }
  });

  // 输出结果
  entityInfos.forEach((info, ei) => {
    const texts = textMatches.get(ei) || [];
    const rotationApplied = texts.length > 0
      ? meanAngleDeg(texts.map(t => t.rotation))
      : 0;

    // 如果需要旋转纠正，先生成旋转后的副本
    const entityForRender = rotationApplied
      ? rotateEntityCopy(info.entity, { x: 0, y: 0 }, -rotationApplied)
      : info.entity;

    const rendered = renderEntityToImage(entityForRender, strokeWidth, blocks, dxf);

    finalResults.push({
      type: info.entity.type,
      index: info.index,
      rotationApplied,
      bounds: info.bounds,
      textsList: texts.map(t => t.raw),
      textsMap: texts.reduce((acc, t, i) => { acc[i] = t.raw; return acc; }, {}),
      imageUrl: rendered ? rendered.imageUrl : null,
      position: rendered ? rendered.position : null,
      size: rendered ? rendered.size : null
    });
  });

  return finalResults;
}


function toDeg(rad) { return rad * 180 / Math.PI; }
