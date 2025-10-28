import {
  getHalfStroke,
  unitsToPx,
  getEntityBounds,
  rotatePointAround,
  getEntityCanvasBounds,
  getEntityCanvasBoundsByCenter,
  getCanvasTransform,
  resolveBlock
} from './sloperProcess';

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
  bounds,
  strokeWidth = 18,
  blocks = {},
  dxf = null,
  fillInside = false
) {
  const { transformX, transformY } = getCanvasTransform(bounds, scale);

  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = "#000";
  ctx.beginPath();

  let ctxFill = false;

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
      ctxFill = true;
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
      ctxFill = true;
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
      ctxFill = true;
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
      if (entity.closePath) {
        ctxFill = true;
      }
      break;
    }

    case "INSERT": {
      const block = resolveBlock(blocks, entity.name, dxf);
      if (!block || !block.entities) break;
      
      ctx.save();
      for (const child of block.entities) {
        // 跳过文本节点
        if (child.type === "TEXT") continue;

        drawEntity(
          ctx,
          child,
          scale,
          bounds,
          strokeWidth,
          blocks,
          dxf,
          fillInside
        );
      }
      ctx.restore();
      break;
    }
  }

  if (ctxFill && fillInside) {
    ctx.fillStyle = "#fff";
    ctx.fill();
  }

  ctx.stroke();
}

function renderEntityToImage(
  entity,
  strokeWidth = 18,
  blocks = {},
  dxf = null,
  fillInside = false
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
  drawEntity(ctx, entity, scale, bounds, strokeWidth, blocks, dxf, fillInside);

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
export function generateCanvasSloper(
  dxf,
  { bounds: globalBounds, canvasBounds: globalCanvasBounds, scale: globalScale },
  offsetRotation = 0,
  fillInside = false
) {
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

      const halfStroke = getHalfStroke(strokeWidth);
      const textWidth = e.textWidth || 20;
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
    } else if (e.type === "INSERT") {
      // 特殊处理INSERT实体：检查其block.entities中是否有文本节点
      const block = resolveBlock(blocks, e.name, dxf);
      if (block && block.entities) {
        const hasTextNode = block.entities.some(child => child.type === "TEXT");
        
        if (hasTextNode) {
          // 如果block.entities中有文本节点，提取文本信息
          block.entities.forEach(child => {
            if (child.type === "TEXT") {
              const pos =
                (child.startPoint && { x: child.startPoint.x, y: child.startPoint.y }) ||
                (child.position && { x: child.position.x, y: child.position.y }) ||
                (child.insert && { x: child.insert.x, y: child.insert.y }) ||
                null;
              if (!pos) return;

              const halfStroke = getHalfStroke(strokeWidth);
              const textWidth = child.textWidth || 20;
              const textHeight = child.textHeight || 20;
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
                entity: child,
                x: pos.x,
                y: pos.y,
                centerX: textCenter.x,
                centerY: textCenter.y,
                bounds: textBounds,
                rotation:
                  typeof child.rotation === "number"
                    ? mathToNorthAngle(child.rotation)
                    : mathToNorthAngle(child.angle || 0),
                raw: child.text || "",
                layer: child.layer || null,
                parentInsert: e // 标记这个文本来自INSERT块
              });
            }
          });
        }
        
        // 无论是否有文本节点，INSERT实体都要作为可渲染实体处理
        if (isRenderableEntity(e)) {
          entities.push({ entity: e, index: i, hasTextNode });
        }
      } else if (isRenderableEntity(e)) {
        entities.push({ entity: e, index: i });
      }
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
      const rendered = renderEntityToImage(entity, strokeWidth, blocks, dxf, fillInside);
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

    // 特殊处理：如果文本来自INSERT块，直接匹配到其父INSERT实体
    if (t.parentInsert) {
      const parentInsertIndex = entityInfos.findIndex(en => en.entity === t.parentInsert);
      if (parentInsertIndex !== -1) {
        if (!textMatches.has(parentInsertIndex)) textMatches.set(parentInsertIndex, []);
        textMatches.get(parentInsertIndex).push({ ...t, textIndex: ti });
        textToEntityMap.set(ti, parentInsertIndex);
        console.log(`Text ${ti} (${t.raw}) matched to parent INSERT entity ${parentInsertIndex}`);
        return;
      }
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
      ? rotateEntityCopy(info.entity, { x: 0, y: 0 }, -offsetRotation)
      : info.entity;

    const rendered = renderEntityToImage(
      entityForRender,
      strokeWidth,
      blocks,
      dxf,
      fillInside
    );

    // 获取到canvas坐标系下的 实体坐标
    const entityCanvasBounds = getEntityCanvasBounds(info.entity, globalBounds, globalScale);
    const { newMinX, newMinY } = getEntityCanvasBoundsByCenter(entityCanvasBounds, globalCanvasBounds, offsetRotation);

    rendered.position = {
      x: Math.round(newMinX * 1000) / 1000,
      y: Math.round(newMinY * 1000) / 1000,
    }

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
