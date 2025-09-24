import { getEntityBounds, unitsToPx } from './generateCanvasSloper'

// ====== 多实体专用 drawEntity ======
// ====== 多实体专用 drawEntity ======
function drawEntityMulti(ctx, entity, scale, offsetX, offsetY, bounds, strokeWidth = 18, dxf = null) {
  // 与其它地方保持一致：Y 轴要使用 bounds.maxY 做翻转
  const transformX = x => (x - bounds.minX) * scale + offsetX;
  const transformY = y => (bounds.maxY - y) * scale + offsetY;
  const radius = 5 * scale; // 圆角半径

  // helper: 旋转点（围绕 center）
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

  // helper: 将 block 的 child 变换到“全局模型坐标”
  function transformChildToGlobal(child, basePoint, insertPoint, scaleX, scaleY, rotation) {
    const copy = JSON.parse(JSON.stringify(child));
    const applyBase = p => ({ x: p.x - (basePoint.x || 0), y: p.y - (basePoint.y || 0) });

    // 减 basePoint
    if (copy.vertices) copy.vertices = copy.vertices.map(v => applyBase(v));
    if (copy.center) copy.center = applyBase(copy.center);
    if (copy.startPoint) copy.startPoint = applyBase(copy.startPoint);
    if (copy.controlPoints) copy.controlPoints = copy.controlPoints.map(applyBase);

    // 缩放（model units）
    if (copy.vertices) copy.vertices = copy.vertices.map(v => ({ x: v.x * scaleX, y: v.y * scaleY }));
    if (copy.center) {
      copy.center = { x: copy.center.x * scaleX, y: copy.center.y * scaleY };
      if (typeof copy.radius === 'number') copy.radius *= Math.max(scaleX, scaleY);
    }
    if (copy.startPoint) copy.startPoint = { x: copy.startPoint.x * scaleX, y: copy.startPoint.y * scaleY };
    if (copy.controlPoints) copy.controlPoints = copy.controlPoints.map(p => ({ x: p.x * scaleX, y: p.y * scaleY }));

    // 旋转（以原点为中心）
    if (rotation) {
      if (copy.vertices) copy.vertices = copy.vertices.map(v => rotatePointAround(v, { x: 0, y: 0 }, rotation));
      if (copy.center) copy.center = rotatePointAround(copy.center, { x: 0, y: 0 }, rotation);
      if (copy.startPoint) copy.startPoint = rotatePointAround(copy.startPoint, { x: 0, y: 0 }, rotation);
      if (copy.controlPoints) copy.controlPoints = copy.controlPoints.map(p => rotatePointAround(p, { x: 0, y: 0 }, rotation));

      // 角度属性也需要累加旋转（如 ARC / TEXT）
      if (typeof copy.startAngle === 'number') copy.startAngle = (copy.startAngle + rotation) % 360;
      if (typeof copy.endAngle === 'number') copy.endAngle = (copy.endAngle + rotation) % 360;
      if (typeof copy.rotation === 'number') copy.rotation = (copy.rotation + rotation) % 360;
      if (typeof copy.angle === 'number') copy.angle = (copy.angle + rotation) % 360;
    }

    // 平移到 INSERT 位置（model units）
    if (copy.vertices) copy.vertices = copy.vertices.map(v => ({ x: v.x + (insertPoint.x || 0), y: v.y + (insertPoint.y || 0) }));
    if (copy.center) copy.center = { x: copy.center.x + (insertPoint.x || 0), y: copy.center.y + (insertPoint.y || 0) };
    if (copy.startPoint) copy.startPoint = { x: copy.startPoint.x + (insertPoint.x || 0), y: copy.startPoint.y + (insertPoint.y || 0) };
    if (copy.controlPoints) copy.controlPoints = copy.controlPoints.map(p => ({ x: p.x + (insertPoint.x || 0), y: p.y + (insertPoint.y || 0) }));

    return copy;
  }

  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = '#000';

  // 每个 entity 的绘制：单独开始 path & stroke（避免 path 被错误累积）
  switch (entity.type) {
    case 'TEXT': {
      if (!entity.startPoint) break;
      ctx.beginPath();
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
      } else {
        ctx.fillText(entity.text || '[空文本]', textX, textY);
      }
      ctx.stroke();
      break;
    }

    case 'LINE': {
      if (!entity.vertices || entity.vertices.length < 2) break;
      ctx.beginPath();
      ctx.moveTo(transformX(entity.vertices[0].x), transformY(entity.vertices[0].y));
      ctx.lineTo(transformX(entity.vertices[1].x), transformY(entity.vertices[1].y));
      ctx.stroke();
      break;
    }

    case 'CIRCLE': {
      if (!entity.center) break;
      ctx.beginPath();
      ctx.arc(transformX(entity.center.x), transformY(entity.center.y), entity.radius * scale, 0, 2 * Math.PI);
      ctx.stroke();
      break;
    }

    case 'ARC': {
      if (!entity.center) break;
      ctx.beginPath();
      const startAngle = ((entity.startAngle || 0) * Math.PI) / 180;
      const endAngle = ((entity.endAngle || 0) * Math.PI) / 180;
      ctx.arc(transformX(entity.center.x), transformY(entity.center.y), entity.radius * scale, -endAngle, -startAngle, true);
      ctx.stroke();
      break;
    }

    case 'POLYLINE':
    case 'LWPOLYLINE': {
      if (!entity.vertices || entity.vertices.length === 0) break;
      ctx.beginPath();
      const pts = entity.vertices.map(v => ({ x: transformX(v.x), y: transformY(v.y) }));
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
        const v0 = { x: p0.x - p1.x, y: p0.y - p1.y };
        const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
        const len0 = Math.hypot(v0.x, v0.y), len1 = Math.hypot(v1.x, v1.y);
        const r0 = Math.min(radius, len0 / 2), r1 = Math.min(radius, len1 / 2);
        const pA = { x: p1.x + v0.x / len0 * r0, y: p1.y + v0.y / len0 * r0 };
        const pB = { x: p1.x + v1.x / len1 * r1, y: p1.y + v1.y / len1 * r1 };
        ctx.lineTo(pA.x, pA.y);
        ctx.quadraticCurveTo(p1.x, p1.y, pB.x, pB.y);
      }
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
      // 取 block（注意 dxf.blocks 里的结构可能是 keyed object）
      const block = (dxf && dxf.blocks) ? (dxf.blocks[entity.name] || Object.values(dxf.blocks).find(b => b && (b.name === entity.name || String(b.handle) === String(entity.name)))) : null;
      if (!block || !block.entities || block.entities.length === 0) break;

      const insertPoint = entity.position || entity.insert || { x: 0, y: 0 };
      const xScale = entity.xScale || entity.scaleX || 1;
      const yScale = entity.yScale || entity.scaleY || 1;
      const rotation = entity.rotation || entity.angle || 0;
      const basePoint = block.basePoint || block.position || { x: 0, y: 0 };

      // 将 block 子实体逐个转换为全局模型坐标后递归绘制（避免 canvas 上下文变换与 transform 函数双重作用）
      for (const child of (block.entities || [])) {
        const childGlobal = transformChildToGlobal(child, basePoint, insertPoint, xScale, yScale, rotation);
        // 递归绘制，仍然使用全局 bounds/transform 函数
        drawEntityMulti(ctx, childGlobal, scale, offsetX, offsetY, bounds, strokeWidth, dxf);
      }
      break;
    } // end INSERT

    default:
      // 不支持的类型忽略
      break;
  } // switch
}


export function generateAllCanvasSloper(dxf) {
  if (!dxf || !dxf.entities || dxf.entities.length === 0) {
    console.warn('没有实体可以合并渲染');
    return;
  }

  const supportedTypes = ['LINE', 'CIRCLE', 'ARC', 'POLYLINE', 'LWPOLYLINE', 'SPLINE', 'TEXT', 'POINT', 'ELLIPSE', 'INSERT'];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let renderableEntities = [];
  const strokeWidth = 18;

  // 计算总体边界
  dxf.entities.forEach(entity => {
    if (!entity || !entity.type || !supportedTypes.includes(entity.type)) return;

    // 跳过 TEXT 节点
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

  // 过滤掉 TEXT 节点
  renderableEntities = renderableEntities.filter(entity => entity.type !== 'TEXT');

  const entityWidth = maxX - minX;
  const entityHeight = maxY - minY;

  if (entityWidth === 0 || entityHeight === 0) {
    console.warn('实体尺寸为零，无法生成画布');
    return;
  }

  // 动态画布宽高（单位 mm -> px）
  const canvasWidth = unitsToPx(entityWidth);
  const canvasHeight = unitsToPx(entityHeight);

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');

  const scale = canvasWidth / entityWidth; // 或者 canvasHeight/entityHeight
  const offsetX = 0;
  const offsetY = 0;
  const bounds = { minX, minY, maxX, maxY };

  try {
    renderableEntities.forEach(entity => 
      drawEntityMulti(ctx, entity, scale, offsetX, offsetY, bounds, strokeWidth, dxf)
    );

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