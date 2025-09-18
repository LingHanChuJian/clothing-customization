const DEFAULT_DPI = 150;
const UNIT_MM = 1; // 1单位 = 1mm

export function unitsToPx(value, dpi = DEFAULT_DPI) {
  return value * dpi / 25.4; // mm -> px
}

// 判断实体是否可以渲染
function isRenderableEntity(entity) {
  const supportedTypes = ['LINE', 'CIRCLE', 'ARC', 'POLYLINE', 'LWPOLYLINE', 'SPLINE', 'TEXT'];
  return supportedTypes.includes(entity.type);
}

// 计算边界并预留线条宽度，保证不被裁切
export function getEntityBounds(entity, strokeWidth = 18) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const halfStroke = strokeWidth / 2 / DEFAULT_DPI * 25.4; // px -> mm 回算补偿

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

// 获取实体旋转角度
function getEntityRotation(entity) {
//   switch(entity.type) {
//     case 'TEXT':
//       return entity.rotation || 0;
//     case 'LINE':
//       if (entity.vertices && entity.vertices.length >= 2) {
//         const dx = entity.vertices[1].x - entity.vertices[0].x;
//         const dy = entity.vertices[1].y - entity.vertices[0].y;
//         return Math.atan2(dy, dx) * 180 / Math.PI;
//       }
//       return 0;
//     case 'POLYLINE':
//     case 'LWPOLYLINE':
//       if (entity.vertices && entity.vertices.length >= 2) {
//         const dx = entity.vertices[entity.vertices.length - 1].x - entity.vertices[0].x;
//         const dy = entity.vertices[entity.vertices.length - 1].y - entity.vertices[0].y;
//         return Math.atan2(dy, dx) * 180 / Math.PI;
//       }
//       return 0;
//     case 'SPLINE':
//       if (entity.controlPoints && entity.controlPoints.length >= 2) {
//         const dx = entity.controlPoints[entity.controlPoints.length - 1].x - entity.controlPoints[0].x;
//         const dy = entity.controlPoints[entity.controlPoints.length - 1].y - entity.controlPoints[0].y;
//         return Math.atan2(dy, dx) * 180 / Math.PI;
//       }
//       return 0;
//     case 'ARC':
//     case 'CIRCLE':
//       return 0;
//     default:
//       return 0;
//   }
    return 0
}

export function drawEntity(ctx, entity, scale, offsetX, offsetY, bounds, strokeWidth = 18) {
    const transformX = x => (x - bounds.minX) * scale + offsetX;
    const transformY = y => (bounds.maxY - y) * scale + offsetY;
    const radius = 5 * scale; // 圆角半径，可调
  
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = '#000';
    // ctx.fillStyle = '#fff'; // 内部填充白色，可选
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
  
          // 计算圆角切点
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
  
        // 原直角折线绘制（注释保留）
        // ctx.moveTo(transformX(entity.vertices[0].x), transformY(entity.vertices[0].y));
        // for (let i = 1; i < entity.vertices.length; i++) {
        //   ctx.lineTo(transformX(entity.vertices[i].x), transformY(entity.vertices[i].y));
        // }
        break;
  
      case 'SPLINE':
        ctx.moveTo(transformX(entity.controlPoints[0].x), transformY(entity.controlPoints[0].y));
        for (let i = 1; i < entity.controlPoints.length; i++) {
          ctx.lineTo(transformX(entity.controlPoints[i].x), transformY(entity.controlPoints[i].y));
        }
        break;
    }
  
    // ctx.fill();   // 内部填充白色，可选
    ctx.stroke(); // 外框黑色
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

  // 透明背景
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
    rotation: getEntityRotation(entity) // 新增旋转角度
  };
}

export function generateCanvasSloper(json) {
    if (!json || !json.entities || json.entities.length === 0) return [];
  
    const entities = [];
    const texts = [];
  
    // 先分类
    for (let i = 0; i < json.entities.length; i++) {
      const entity = json.entities[i];
      if (!entity || !entity.type) continue;
      if (entity.type === 'TEXT') {
        texts.push(entity);
      } else if (isRenderableEntity(entity)) {
        entities.push({ entity, index: i });
      }
    }
  
    const entityImages = [];
  
    // 遍历图形实体
    for (let { entity, index } of entities) {
      const imageData = renderEntityToImage(entity);
      if (!imageData) continue;
  
      const bounds = getEntityBounds(entity);
      if (bounds) {
        // 找出所有在这个实体范围内的 text
        const matchedTexts = texts
          .filter(t => {
            const p = t.startPoint;
            return (
              p &&
              p.x >= bounds.minX &&
              p.x <= bounds.maxX &&
              p.y >= bounds.minY &&
              p.y <= bounds.maxY
            );
          })
          .map(t => {
            // 提取 label 和 value
            const raw = t.text || '';
            const match = raw.match(/^([^:：]+)\s*[:：]\s*(.+)$/);
            if (match) {
              return { label: match[1].trim(), value: match[2].trim(), rotation: t.rotation };
            } else {
              return { label: 'unknown', value: raw, rotation: t.rotation };
            }
          });
  
        imageData.texts = matchedTexts; // 数组存放在实体里
      } else {
        imageData.texts = [];
      }
  
      entityImages.push({ ...imageData, type: entity.type, index });
    }
  
    return entityImages;
}
  
  
