const DEFAULT_DPI = 150;
const UNIT_MM = 1; // 1单位 = 1mm

export function unitsToPx(value, dpi = DEFAULT_DPI) {
  return (value * dpi) / 25.4; // mm -> px
}

function isRenderableEntity(entity) {
  const supportedTypes = [
    "LINE",
    "CIRCLE",
    "ARC",
    "POLYLINE",
    "LWPOLYLINE",
    "SPLINE",
    "TEXT",
    "INSERT",
  ];
  return supportedTypes.includes(entity.type);
}

/* ---------- helpers ---------- */

// 兼容各种属性命名来拿到插入点
function getInsertPoint(entity) {
  return (
    entity.insert ||
    entity.position ||
    entity.insertPoint ||
    entity.basePoint || { x: 0, y: 0 }
  );
}

// 尝试从 blocks / dxf 中解析出 block 定义（支持 object keyed by name、array、以及常见别名）
function resolveBlock(blocksParam, name, dxf) {
  if (!name) return null;
  let block = null;

  // 1) 如果传入的是 keyed object（最常见），直接取
  if (
    blocksParam &&
    typeof blocksParam === "object" &&
    !Array.isArray(blocksParam)
  ) {
    if (blocksParam[name]) block = blocksParam[name];
    else {
      // 大小写不敏感查找 key
      const key = Object.keys(blocksParam).find(
        (k) => k.toLowerCase() === name.toLowerCase()
      );
      if (key) block = blocksParam[key];
    }
  }

  // 2) blocksParam 可能是数组
  if (!block && Array.isArray(blocksParam)) {
    block = blocksParam.find(
      (b) => b && (b.name === name || String(b.handle) === String(name))
    );
  }

  // 3) 仍然没找到或 entities 为空时，尝试在 dxf 的 blocks 值数组里搜索实际有 entities 的定义
  if (
    (!block || !block.entities || block.entities.length === 0) &&
    dxf &&
    dxf.blocks
  ) {
    const vals = Array.isArray(dxf.blocks)
      ? dxf.blocks
      : Object.values(dxf.blocks);
    for (const b of vals) {
      if (!b) continue;
      if (
        (b.name === name || (b.handle && String(b.handle) === String(name))) &&
        b.entities &&
        b.entities.length > 0
      ) {
        block = b;
        break;
      }
    }
  }

  // 4) 额外尝试一些常见备用容器（blockRecords / blocksList / blocksArray）
  if ((!block || !block.entities || block.entities.length === 0) && dxf) {
    const candidates = [].concat(
      dxf.blockRecords || [],
      dxf.blocksList || [],
      dxf.blocksArray || []
    );
    for (const b of candidates) {
      if (!b) continue;
      if (
        (b.name === name || (b.handle && String(b.handle) === String(name))) &&
        b.entities &&
        b.entities.length > 0
      ) {
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
  const cosA = Math.cos(rad),
    sinA = Math.sin(rad);
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return {
    x: center.x + dx * cosA - dy * sinA,
    y: center.y + dx * sinA + dy * cosA,
  };
}

/* ---------- 主逻辑：bounds / draw / render ---------- */

export function getEntityBounds(
  entity,
  strokeWidth = 18,
  blocks = {},
  dxf = null
) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  const halfStroke = (strokeWidth / 2 / DEFAULT_DPI) * 25.4;

  switch (entity.type) {
    case "TEXT": {
      const pos = entity.startPoint || entity.position || entity.insert || null;
      if (!pos) return null;
      minX = pos.x - halfStroke;
      minY = pos.y - halfStroke;
      maxX = pos.x + (entity.textWidth || 50) + halfStroke;
      maxY = pos.y + (entity.textHeight || 20) + halfStroke;
      break;
    }

    case "LINE": {
      const p1 = entity.startPoint || (entity.vertices && entity.vertices[0]);
      const p2 = entity.endPoint || (entity.vertices && entity.vertices[1]);
      if (!p1 || !p2) return null;
      minX = Math.min(p1.x, p2.x) - halfStroke;
      minY = Math.min(p1.y, p2.y) - halfStroke;
      maxX = Math.max(p1.x, p2.x) + halfStroke;
      maxY = Math.max(p1.y, p2.y) + halfStroke;
      break;
    }

    case "CIRCLE":
    case "ARC": {
      if (!entity.center || typeof entity.radius !== "number") return null;
      minX = entity.center.x - entity.radius - halfStroke;
      minY = entity.center.y - entity.radius - halfStroke;
      maxX = entity.center.x + entity.radius + halfStroke;
      maxY = entity.center.y + entity.radius + halfStroke;
      break;
    }

    case "POLYLINE":
    case "LWPOLYLINE": {
      if (!entity.vertices || entity.vertices.length === 0) return null;
      entity.vertices.forEach((v) => {
        minX = Math.min(minX, v.x - halfStroke);
        minY = Math.min(minY, v.y - halfStroke);
        maxX = Math.max(maxX, v.x + halfStroke);
        maxY = Math.max(maxY, v.y + halfStroke);
      });
      break;
    }

    case "SPLINE": {
      if (!entity.controlPoints || entity.controlPoints.length === 0)
        return null;
      entity.controlPoints.forEach((p) => {
        minX = Math.min(minX, p.x - halfStroke);
        minY = Math.min(minY, p.y - halfStroke);
        maxX = Math.max(maxX, p.x + halfStroke);
        maxY = Math.max(maxY, p.y + halfStroke);
      });
      break;
    }

    case "INSERT": {
      const insertName = entity.name;
      const insertPoint = getInsertPoint(entity);
      if (!insertName || !insertPoint) return null;
      const block = resolveBlock(blocks, insertName, dxf);
      if (!block || !block.entities || block.entities.length === 0) return null;

      const basePoint = block.basePoint ||
        block.position ||
        block.insert || { x: 0, y: 0 };
      const scaleX = entity.xScale || entity.scaleX || 1;
      const scaleY = entity.yScale || entity.scaleY || 1;
      const rotation = entity.rotation || entity.angle || 0;

      for (const child of block.entities) {
        const childCopy = JSON.parse(JSON.stringify(child));
        // 平移到原点
        const applyBase = (p) => ({
          x: p.x - (basePoint.x || 0),
          y: p.y - (basePoint.y || 0),
        });
        if (childCopy.vertices)
          childCopy.vertices = childCopy.vertices.map(applyBase);
        if (childCopy.center) childCopy.center = applyBase(childCopy.center);
        if (childCopy.startPoint)
          childCopy.startPoint = applyBase(childCopy.startPoint);

        // 缩放
        if (childCopy.vertices)
          childCopy.vertices = childCopy.vertices.map((v) => ({
            x: v.x * scaleX,
            y: v.y * scaleY,
          }));
        if (childCopy.center) {
          childCopy.center = {
            x: childCopy.center.x * scaleX,
            y: childCopy.center.y * scaleY,
          };
          if (childCopy.radius) childCopy.radius *= Math.max(scaleX, scaleY);
        }
        if (childCopy.startPoint)
          childCopy.startPoint = {
            x: childCopy.startPoint.x * scaleX,
            y: childCopy.startPoint.y * scaleY,
          };

        // 旋转
        if (rotation) {
          if (childCopy.vertices)
            childCopy.vertices = childCopy.vertices.map((v) =>
              rotatePointAround(v, { x: 0, y: 0 }, rotation)
            );
          if (childCopy.center)
            childCopy.center = rotatePointAround(
              childCopy.center,
              { x: 0, y: 0 },
              rotation
            );
          if (childCopy.startPoint)
            childCopy.startPoint = rotatePointAround(
              childCopy.startPoint,
              { x: 0, y: 0 },
              rotation
            );
        }

        // 平移
        if (childCopy.vertices)
          childCopy.vertices = childCopy.vertices.map((v) => ({
            x: v.x + insertPoint.x,
            y: v.y + insertPoint.y,
          }));
        if (childCopy.center)
          childCopy.center = {
            x: childCopy.center.x + insertPoint.x,
            y: childCopy.center.y + insertPoint.y,
          };
        if (childCopy.startPoint)
          childCopy.startPoint = {
            x: childCopy.startPoint.x + insertPoint.x,
            y: childCopy.startPoint.y + insertPoint.y,
          };

        const b = getEntityBounds(childCopy, strokeWidth, blocks, dxf);
        if (b) {
          minX = Math.min(minX, b.minX);
          minY = Math.min(minY, b.minY);
          maxX = Math.max(maxX, b.maxX);
          maxY = Math.max(maxY, b.maxY);
        }
      }
      break;
    }

    default:
      return null;
  }

  if (minX === Infinity) return null;
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

export function drawEntity(
  ctx,
  entity,
  scale,
  offsetX,
  offsetY,
  bounds,
  strokeWidth = 18,
  blocks = {},
  dxf = null
) {
  const transformX = (x) => (x - bounds.minX) * scale + offsetX;
  const transformY = (y) => (bounds.maxY - y) * scale + offsetY;

  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = "#000";
  ctx.beginPath();

  switch (entity.type) {
    case "TEXT": {
      const pos = entity.startPoint ||
        entity.position ||
        entity.insert || { x: 0, y: 0 };
      const fontSize = Math.max(12, (entity.textHeight || 5) * scale);
      ctx.font = `${fontSize}px Arial`;
      ctx.textBaseline = "middle";
      const x = transformX(pos.x);
      const y = transformY(pos.y);
      ctx.save();
      if (entity.rotation) {
        ctx.translate(x, y);
        ctx.rotate(-(entity.rotation * Math.PI) / 180);
        ctx.fillText(entity.text || "", 0, 0);
      } else {
        ctx.fillText(entity.text || "", x, y);
      }
      ctx.restore();
      break;
    }

    case "LINE": {
      const p1 = entity.startPoint || (entity.vertices && entity.vertices[0]);
      const p2 = entity.endPoint || (entity.vertices && entity.vertices[1]);
      if (!p1 || !p2) break;
      ctx.moveTo(transformX(p1.x), transformY(p1.y));
      ctx.lineTo(transformX(p2.x), transformY(p2.y));
      break;
    }

    case "CIRCLE":
      ctx.arc(
        transformX(entity.center.x),
        transformY(entity.center.y),
        entity.radius * scale,
        0,
        2 * Math.PI
      );
      break;

    case "ARC": {
      const start = ((entity.startAngle || 0) * Math.PI) / 180;
      const end = ((entity.endAngle || 0) * Math.PI) / 180;
      ctx.arc(
        transformX(entity.center.x),
        transformY(entity.center.y),
        entity.radius * scale,
        -end,
        -start,
        true
      );
      break;
    }

    case "POLYLINE":
    case "LWPOLYLINE": {
      if (!entity.vertices || entity.vertices.length === 0) break;
      const pts = entity.vertices.map((v) => ({
        x: transformX(v.x),
        y: transformY(v.y),
      }));
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      if (entity.closed || entity.shape) ctx.closePath();
      break;
    }

    case "SPLINE": {
      if (!entity.controlPoints || entity.controlPoints.length === 0) break;
      ctx.moveTo(
        transformX(entity.controlPoints[0].x),
        transformY(entity.controlPoints[0].y)
      );
      for (let i = 1; i < entity.controlPoints.length; i++) {
        ctx.lineTo(
          transformX(entity.controlPoints[i].x),
          transformY(entity.controlPoints[i].y)
        );
      }
      break;
    }

    case "INSERT": {
      const block = resolveBlock(blocks, entity.name, dxf);
      if (!block || !block.entities) break;
      ctx.save();
      for (const child of block.entities) {
        const childCopy = JSON.parse(JSON.stringify(child));
        // (和 getEntityBounds 同步的几何变换)
        drawEntity(
          ctx,
          childCopy,
          scale,
          offsetX,
          offsetY,
          bounds,
          strokeWidth,
          blocks,
          dxf
        );
      }
      ctx.restore();
      break;
    }
  }

  ctx.stroke();
}

function renderEntityToImage(
  entity,
  strokeWidth = 18,
  blocks = {},
  dxf = null
) {
  const bounds = getEntityBounds(entity, strokeWidth, blocks, dxf);
  if (!bounds) return null;
  const entityWidth = bounds.maxX - bounds.minX;
  const entityHeight = bounds.maxY - bounds.minY;
  if (entityWidth === 0 || entityHeight === 0) return null;
  const widthPx = unitsToPx(entityWidth);
  const heightPx = unitsToPx(entityHeight);
  const scale = widthPx / entityWidth;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(widthPx));
  canvas.height = Math.max(1, Math.round(heightPx));
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawEntity(ctx, entity, scale, 0, 0, bounds, strokeWidth, blocks, dxf);

  return {
    imageUrl: canvas.toDataURL("image/png"),
    position: {
      x: Math.round(unitsToPx(bounds.minX) * 1000) / 1000,
      y: Math.round(unitsToPx(bounds.minY) * 1000) / 1000,
    },
    size: {
      width: Math.round(widthPx * 1000) / 1000,
      height: Math.round(heightPx * 1000) / 1000,
    },
    rotation: 0,
  };
}

function rotateEntityCopy(entity, center, angleDeg) {
  if (!entity) return null;
  const copy = JSON.parse(JSON.stringify(entity));
  switch (copy.type) {
    case "LINE":
    case "POLYLINE":
    case "LWPOLYLINE":
      if (copy.vertices)
        copy.vertices = copy.vertices.map((v) =>
          rotatePointAround(v, center, angleDeg)
        );
      break;
    case "SPLINE":
      if (copy.controlPoints)
        copy.controlPoints = copy.controlPoints.map((p) =>
          rotatePointAround(p, center, angleDeg)
        );
      break;
    case "CIRCLE":
    case "ARC":
      if (copy.center)
        copy.center = rotatePointAround(copy.center, center, angleDeg);
      if (copy.type === "ARC") {
        copy.startAngle = ((copy.startAngle || 0) + angleDeg) % 360;
        copy.endAngle = ((copy.endAngle || 0) + angleDeg) % 360;
      }
      break;
    case "TEXT":
      if (copy.startPoint)
        copy.startPoint = rotatePointAround(copy.startPoint, center, angleDeg);
      copy.rotation =
        (typeof copy.rotation === "number" ? copy.rotation : 0) + angleDeg;
      break;
  }
  return copy;
}

// offsetRotation 顺时针抵消度数
export function generateCanvasSloper(dxf, offsetRotation = 0) {
  if (!dxf || !dxf.entities || dxf.entities.length === 0) return [];

  const entities = [];
  const textsRaw = [];
  const strokeWidth = 18;
  const blocks = dxf.blocks || {};
  const typePriority = {
    POLYLINE: 1,
    LWPOLYLINE: 1,
    INSERT: 2,
    CIRCLE: 3,
    ARC: 3,
    LINE: 4,
    SPLINE: 5,
  };

  // 分离文字和实体，并为文字计算边界框和中心点
  for (let i = 0; i < dxf.entities.length; i++) {
    const e = dxf.entities[i];
    if (!e || !e.type) continue;
    if (e.type === "TEXT") {
      const pos =
        (e.startPoint && { x: e.startPoint.x, y: e.startPoint.y }) ||
        (e.position && { x: e.position.x, y: e.position.y }) ||
        (e.insert && { x: e.insert.x, y: e.insert.y }) ||
        null;
      if (!pos) continue;

      const halfStroke = (strokeWidth / 2 / DEFAULT_DPI) * 25.4;
      const textWidth =  e.textWidth || 20;
      const textHeight = e.textHeight || 20;
      const textBounds = {
        minX: pos.x - halfStroke,
        minY: pos.y - halfStroke,
        maxX: pos.x + textWidth + halfStroke,
        maxY: pos.y + textHeight + halfStroke,
      };
      const textCenter = {
        x: (textBounds.minX + textBounds.maxX) / 2,
        y: (textBounds.minY + textBounds.maxY) / 2,
      };
      textsRaw.push({
        entity: e,
        x: pos.x,
        y: pos.y,
        centerX: textCenter.x,
        centerY: textCenter.y,
        bounds: textBounds,
        rotation:
          typeof e.rotation === "number"
            ? mathToNorthAngle(e.rotation)
            : mathToNorthAngle(e.angle || 0),
        raw: e.text || "",
        layer: e.layer || null, // 提取 layer 信息
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
        size: rendered ? rendered.size : null,
      });
    }
    return finalResults;
  }

  /* ---------- 有文字时的匹配逻辑 ---------- */

  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const meanAngleDeg = (angles) => {
    if (!angles || angles.length === 0) return 0;
    let sx = 0,
      sy = 0;
    for (const a of angles) {
      const r = toRad(a);
      sx += Math.cos(r);
      sy += Math.sin(r);
    }
    return normalizeNorthAngle(toDeg(Math.atan2(sy, sx)));
  };

  function distancePointToRect(px, py, rect) {
    if (!rect) return Infinity;
    const dx = Math.max(rect.minX - px, 0, px - rect.maxX);
    const dy = Math.max(rect.minY - py, 0, py - rect.maxY);
    return Math.sqrt(dx * dx + dy * dy);
  }

  function distancePointToCenter(px, py, rect) {
    if (!rect) return Infinity;
    const centerX = (rect.minX + rect.maxX) / 2;
    const centerY = (rect.minY + rect.maxY) / 2;
    return Math.sqrt((px - centerX) ** 2 + (py - centerY) ** 2);
  }

  function getBoundsArea(bounds) {
    if (!bounds) return Infinity;
    return (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY);
  }

  function getIntersectionArea(rect1, rect2) {
    if (!rect1 || !rect2) return 0;
    const overlapX = Math.max(0, Math.min(rect1.maxX, rect2.maxX) - Math.max(rect1.minX, rect2.minX));
    const overlapY = Math.max(0, Math.min(rect1.maxY, rect2.maxY) - Math.max(rect1.minY, rect2.minY));
    return overlapX * overlapY;
  }

  const entityInfos = entities
    .map(({ entity, index }) => {
      const bounds = getEntityBounds(entity, strokeWidth, blocks, dxf);
      return { entity, index, bounds, area: bounds ? getBoundsArea(bounds) : Infinity };
    })
    .filter((e) => e.bounds);

  // 计算全局模型尺寸，用于动态阈值
  const allBounds = entityInfos.map(e => e.bounds);
  const modelWidth = Math.max(...allBounds.map(b => b.maxX - b.minX), 1);
  const modelHeight = Math.max(...allBounds.map(b => b.maxY - b.minY), 1);

  // 为每个文字找最近的实体
  const textMatches = new Map();
  const textToEntityMap = new Map(); // 防止文字重复匹配
  textsRaw.forEach((t, ti) => {
    if (t.centerX == null || t.centerY == null) {
      console.log(`Text ${ti} (${t.raw}) skipped: invalid center position`);
      return;
    }

    let candidates = [];
    entityInfos.forEach((en, ei) => {
      const b = en.bounds;
      // 使用文字中心点判断 inside
      const inside = t.centerX >= b.minX && t.centerX <= b.maxX && t.centerY >= b.minY && t.centerY <= b.maxY;
      // 计算文字边界框与实体边界框的重叠面积
      const overlapArea = getIntersectionArea(t.bounds, b);
      const dist = inside ? 0 : distancePointToRect(t.centerX, t.centerY, b);
      const centerDist = distancePointToCenter(t.centerX, t.centerY, b);
      const entitySize = Math.max(b.maxX - b.minX, b.maxY - b.minY);
      const maxDist = Math.max(20, Math.min(modelWidth, modelHeight) * 0.05, entitySize * 0.1);
      const priority = typePriority[en.entity.type] || 10;
      const areaWeight = en.area / (modelWidth * modelHeight);
      // 得分：优先考虑重叠面积（越大越好），然后中心距离和优先级
      const score = overlapArea > 0 ? (centerDist * priority * (1 + areaWeight) / (overlapArea + 1)) : (dist * priority * (1 + areaWeight));

      // console.log('check inside:', {
      //   index: ei,
      //   raw: t.raw,
      //   tx: t.x, ty: t.y,
      //   centerX: t.centerX, centerY: t.centerY,
      //   minX: b.minX, maxX: b.maxX,
      //   minY: b.minY, maxY: b.maxY,
      //   inside,
      //   dist,
      //   centerDist,
      //   overlapArea,
      //   maxDist,
      //   score,
      //   entityType: en.entity.type,
      //   area: en.area
      // });

      if (overlapArea > 0 || dist <= maxDist) {
        candidates.push({ idx: ei, dist, score });
      }
    });

    if (candidates.length > 0) {
      candidates.sort((a, b) => a.score - b.score);
      const best = candidates[0];
      if (!textToEntityMap.has(ti)) {
        // console.log(`Text ${ti} (${t.raw}) matched to entity ${best.idx}, score: ${best.score}, dist: ${best.dist}`);
        if (!textMatches.has(best.idx)) textMatches.set(best.idx, []);
        textMatches.get(best.idx).push({ ...t, textIndex: ti });
        textToEntityMap.set(ti, best.idx);
      } else {
        console.log(`Text ${ti} (${t.raw}) skipped: already matched to entity ${textToEntityMap.get(ti)}`);
      }
    } else {
      console.log(`Text ${ti} (${t.raw}) not matched: no entity within max distance or overlap`);
    }
  });

  // 输出结果并记录匹配的文字数量
  entityInfos.forEach((info, ei) => {
    const texts = textMatches.get(ei) || [];
    console.log(`Entity ${ei} (${info.entity.type}) matched ${texts.length} texts:`, texts.map(t => t.raw));
    const rotationApplied =
      texts.length > 0 ? meanAngleDeg(texts.map((t) => t.rotation)) : 0;

    const entityForRender = rotationApplied
      ? rotateEntityCopy(info.entity, { x: 0, y: 0 }, -rotationApplied + offsetRotation)
      : info.entity;

    const rendered = renderEntityToImage(
      entityForRender,
      strokeWidth,
      blocks,
      dxf
    );

    finalResults.push({
      type: info.entity.type,
      index: info.index,
      rotationApplied,
      bounds: info.bounds,
      textsList: texts.map((t) => t.raw),
      textsMap: texts.reduce((acc, t, i) => {
        acc[i] = t.raw;
        return acc;
      }, {}),
      imageUrl: rendered ? rendered.imageUrl : null,
      position: rendered ? rendered.position : null,
      size: rendered ? rendered.size : null,
    });
  });

  return finalResults;
}
