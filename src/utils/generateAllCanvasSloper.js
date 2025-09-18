import { getEntityBounds, unitsToPx } from './generateCanvasSloper'

// ====== 多实体专用 drawEntity ======
function drawEntityMulti(ctx, entity, scale, offsetX, offsetY, bounds, strokeWidth = 18) {
    const transformX = x => (x - bounds.minX) * scale + offsetX;
    const transformY = y => (y - bounds.minY) * scale + offsetY;
    const radius = 5 * scale; // 圆角半径

    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = '#000';
    ctx.beginPath();

    switch (entity.type) {
      case 'TEXT':
        if (!entity.startPoint) break;
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

          // 圆角折线
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
        // 最后一段
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

export function generateAllCanvasSloper(json) {
  if (!json || !json.entities || json.entities.length === 0) {
    console.warn('没有实体可以合并渲染');
    return;
  }

  const supportedTypes = ['LINE', 'CIRCLE', 'ARC', 'POLYLINE', 'LWPOLYLINE', 'SPLINE', 'TEXT', 'POINT', 'ELLIPSE'];

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let renderableEntities = [];

  // 计算总体边界
  json.entities.forEach(entity => {
    if (!entity || !entity.type || !supportedTypes.includes(entity.type)) return;
    // 跳过 TEXT 节点
    if (entity.type === 'TEXT') return;

    const bounds = getEntityBounds(entity);
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
    renderableEntities.forEach(entity => drawEntityMulti(ctx, entity, scale, offsetX, offsetY, bounds));
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
