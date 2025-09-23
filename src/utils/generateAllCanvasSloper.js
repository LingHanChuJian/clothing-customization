import { getEntityBounds, unitsToPx } from './generateCanvasSloper'

// ====== 多实体专用 drawEntity ======
function findBlockInDxf(dxf, name) {
  if (!dxf) return null;
  const blocks = dxf.blocks || {};
  if (blocks[name]) return blocks[name];
  const vals = Object.values(blocks || {});
  return vals.find(b => b && (b.name === name || String(b.handle) === String(name))) || null;
}

function safeApplyBase(p, base) {
  return { x: p.x - (base.x || 0), y: p.y - (base.y || 0) };
}

function drawEntityMulti(ctx, entity, scale, offsetX, offsetY, bounds, strokeWidth = 18, dxf = null) {
  // IMPORTANT: transformY uses bounds.maxY -> keep same orientation as getEntityBounds/drawEntity
  const transformX = x => (x - bounds.minX) * scale + offsetX;
  const transformY = y => (bounds.maxY - y) * scale + offsetY;
  const radius = 5 * scale; // 圆角半径

  // do not set a single beginPath() for all cases; handle per-case
  switch (entity.type) {
    case 'TEXT': {
      if (!entity.startPoint && !entity.position) break;
      const pos = entity.startPoint || entity.position;
      const fontSize = Math.max(12, (entity.textHeight || 5) * scale);
      ctx.font = `${fontSize}px Arial`;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000';
      const textX = transformX(pos.x);
      const textY = transformY(pos.y);
      if (entity.rotation) {
        ctx.save();
        ctx.translate(textX, textY);
        ctx.rotate(-(entity.rotation * Math.PI) / 180);
        ctx.fillText(entity.text || '[空文本]', 0, 0);
        ctx.restore();
      } else {
        ctx.fillText(entity.text || '[空文本]', textX, textY);
      }
      break;
    }

    case 'LINE': {
      if (!(entity.vertices && entity.vertices.length >= 2)) break;
      ctx.beginPath();
      ctx.moveTo(transformX(entity.vertices[0].x), transformY(entity.vertices[0].y));
      ctx.lineTo(transformX(entity.vertices[1].x), transformY(entity.vertices[1].y));
      ctx.stroke();
      break;
    }

    case 'CIRCLE': {
      if (!entity.center || typeof entity.radius !== 'number') break;
      ctx.beginPath();
      ctx.arc(transformX(entity.center.x), transformY(entity.center.y), entity.radius * scale, 0, 2 * Math.PI);
      ctx.stroke();
      break;
    }

    case 'ARC': {
      if (!entity.center || typeof entity.radius !== 'number') break;
      const startA = ((entity.startAngle || 0) * Math.PI) / 180;
      const endA = ((entity.endAngle || 0) * Math.PI) / 180;
      ctx.beginPath();
      // note: we keep same sign convention as other code (negate because transformY flips y)
      ctx.arc(transformX(entity.center.x), transformY(entity.center.y), entity.radius * scale, -endA, -startA, true);
      ctx.stroke();
      break;
    }

    case 'POLYLINE':
    case 'LWPOLYLINE': {
      if (!entity.vertices || entity.vertices.length === 0) break;
      const pts = entity.vertices.map(v => ({ x: transformX(v.x), y: transformY(v.y) }));
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const p0 = pts[i - 1];
        const p1 = pts[i];
        const p2 = pts[i + 1];

        const v0 = { x: p0.x - p1.x, y: p0.y - p1.y };
        const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
        const len0 = Math.hypot(v0.x, v0.y);
        const len1 = Math.hypot(v1.x, v1.y);

        if (len0 < 1e-6 || len1 < 1e-6) {
          // 退化到线段
          ctx.lineTo(p1.x, p1.y);
          continue;
        }

        const r0 = Math.min(radius, len0 / 2);
        const r1 = Math.min(radius, len1 / 2);
        const pA = { x: p1.x + (v0.x / len0) * r0, y: p1.y + (v0.y / len0) * r0 };
        const pB = { x: p1.x + (v1.x / len1) * r1, y: p1.y + (v1.y / len1) * r1 };

        ctx.lineTo(pA.x, pA.y);
        ctx.quadraticCurveTo(p1.x, p1.y, pB.x, pB.y);
      }
      // 最后一段
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      if (entity.closed || entity.shape) ctx.closePath();
      ctx.stroke();
      break;
    }

    case 'SPLINE': {
      if (!entity.controlPoints || entity.controlPoints.length === 0) break;
      ctx.beginPath();
      ctx.moveTo(transformX(entity.controlPoints[0].x), transformY(entity.controlPoints[0].y));
      for (let i = 1; i < entity.controlPoints.length; i++) {
        ctx.lineTo(transformX(entity.controlPoints[i].x), transformY(entity.controlPoints[i].y));
      }
      ctx.stroke();
      break;
    }

    case 'INSERT': {
      // find block definition from dxf.blocks (robust lookup)
      if (!dxf) break;
      const block = findBlockInDxf(dxf, entity.name);
      if (!block || !block.entities || block.entities.length === 0) break;

      const insertPoint = entity.position || entity.insert || entity.insertPoint || { x: 0, y: 0 };
      const scaleX = (entity.xScale !== undefined) ? entity.xScale : ((entity.scaleX !== undefined) ? entity.scaleX : 1);
      const scaleY = (entity.yScale !== undefined) ? entity.yScale : ((entity.scaleY !== undefined) ? entity.scaleY : 1);
      const rotation = entity.rotation || entity.angle || 0;
      const basePoint = block.basePoint || block.position || block.insert || { x: 0, y: 0 };

      // **关键**：不要使用 canvas transform 叠加；用数值方式把 block 内每个子实体转换到世界坐标再绘制
      for (const child of (block.entities || [])) {
        const childCopy = JSON.parse(JSON.stringify(child));

        // 1) 将 child 坐标相对于 block.basePoint 平移到原点 (扣掉 block.basePoint)
        if (childCopy.vertices) childCopy.vertices = childCopy.vertices.map(v => safeApplyBase(v, basePoint));
        if (childCopy.center) childCopy.center = safeApplyBase(childCopy.center, basePoint);
        if (childCopy.startPoint) childCopy.startPoint = safeApplyBase(childCopy.startPoint, basePoint);
        if (childCopy.controlPoints) childCopy.controlPoints = childCopy.controlPoints.map(p => safeApplyBase(p, basePoint));

        // 2) 缩放（以原点为基准）
        if (childCopy.vertices) childCopy.vertices = childCopy.vertices.map(v => ({ x: v.x * scaleX, y: v.y * scaleY }));
        if (childCopy.center) {
          childCopy.center = { x: childCopy.center.x * scaleX, y: childCopy.center.y * scaleY };
          if (childCopy.radius) childCopy.radius *= Math.max(scaleX, scaleY);
        }
        if (childCopy.startPoint) childCopy.startPoint = { x: childCopy.startPoint.x * scaleX, y: childCopy.startPoint.y * scaleY };
        if (childCopy.controlPoints) childCopy.controlPoints = childCopy.controlPoints.map(p => ({ x: p.x * scaleX, y: p.y * scaleY }));

        // 3) 旋转（以原点为中心）
        if (rotation) {
          if (childCopy.vertices) childCopy.vertices = childCopy.vertices.map(v => rotatePointAround(v, { x: 0, y: 0 }, rotation));
          if (childCopy.center) childCopy.center = rotatePointAround(childCopy.center, { x: 0, y: 0 }, rotation);
          if (childCopy.startPoint) childCopy.startPoint = rotatePointAround(childCopy.startPoint, { x: 0, y: 0 }, rotation);
          if (childCopy.controlPoints) childCopy.controlPoints = childCopy.controlPoints.map(p => rotatePointAround(p, { x: 0, y: 0 }, rotation));
        }

        // 4) 平移到 INSERT 的世界坐标位置
        if (childCopy.vertices) childCopy.vertices = childCopy.vertices.map(v => ({ x: v.x + (insertPoint.x || 0), y: v.y + (insertPoint.y || 0) }));
        if (childCopy.center) childCopy.center = { x: childCopy.center.x + (insertPoint.x || 0), y: childCopy.center.y + (insertPoint.y || 0) };
        if (childCopy.startPoint) childCopy.startPoint = { x: childCopy.startPoint.x + (insertPoint.x || 0), y: childCopy.startPoint.y + (insertPoint.y || 0) };
        if (childCopy.controlPoints) childCopy.controlPoints = childCopy.controlPoints.map(p => ({ x: p.x + (insertPoint.x || 0), y: p.y + (insertPoint.y || 0) }));

        // 递归绘制（注意：这里 scale/offset/bounds 仍然是“全局”）
        drawEntityMulti(ctx, childCopy, scale, offsetX, offsetY, bounds, strokeWidth, dxf);
      }

      break;
    }

    default:
      // unsupported type -> ignore
      break;
  }
}

// ====== generateAllCanvasSloper（略微改进：保持 Y 翻转、把 dxf 传下去） ======
export function generateAllCanvasSloper(dxf) {
  if (!dxf || !dxf.entities || dxf.entities.length === 0) {
    console.warn('没有实体可以合并渲染');
    return;
  }

  const supportedTypes = ['LINE', 'CIRCLE', 'ARC', 'POLYLINE', 'LWPOLYLINE', 'SPLINE', 'TEXT', 'POINT', 'ELLIPSE', 'INSERT'];

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let renderableEntities = [];
  const strokeWidth = 18;

  // 计算总体边界（注意把 dxf 传进去以支持 INSERT）
  dxf.entities.forEach(entity => {
    if (!entity || !entity.type || !supportedTypes.includes(entity.type)) return;
    // 跳过 TEXT 节点（但你也可以把 TEXT 加入边界计算，视需求）
    if (entity.type === 'TEXT') return;

    const bounds = getEntityBounds(entity, strokeWidth, dxf.blocks, dxf);
    if (bounds) {
      renderableEntities.push(entity);
      minX = Math.min(minX, bounds.minX);
      minY = Math.min(minY, bounds.minY);
      maxX = Math.max(maxX, bounds.maxX);
      maxY = Math.max(maxY, bounds.maxY);
    }
  });

  if (renderableEntities.length === 0) {
    console.warn('没有可渲染的实体');
    return;
  }

  const entityWidth = maxX - minX;
  const entityHeight = maxY - minY;

  if (entityWidth === 0 || entityHeight === 0) {
    console.warn('实体尺寸为零，无法生成画布');
    return;
  }

  // mm -> px
  const canvasWidth = unitsToPx(entityWidth);
  const canvasHeight = unitsToPx(entityHeight);

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(canvasWidth));
  canvas.height = Math.max(1, Math.round(canvasHeight));
  const ctx = canvas.getContext('2d');

  // scale: px / mm
  const scale = canvasWidth / entityWidth;
  const offsetX = 0;
  const offsetY = 0;
  const bounds = { minX, minY, maxX, maxY };

  try {
    renderableEntities.forEach(entity => drawEntityMulti(ctx, entity, scale, offsetX, offsetY, bounds, strokeWidth, dxf));
    return {
      imageUrl: canvas.toDataURL('image/png'),
      size: {
        width: Math.round(canvasWidth * 1000) / 1000,
        height: Math.round(canvasHeight * 1000) / 1000
      }
    };
  } catch (err) {
    console.error('合并图片生成错误:', err);
  }
}