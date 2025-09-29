const DEFAULT_DPI = 150;
const UNIT_MM = 1; // 1单位 = 1mm

export function unitsToPx(value, dpi = DEFAULT_DPI) {
    return (value * dpi) / 25.4; // mm -> px
}

export function unitsToMm(value, dpi = DEFAULT_DPI) {
    return (value * 25.4) / dpi; // px -> mm
}

export function getHalfStroke(strokeWidth = 18) {
    return (strokeWidth / 2 / DEFAULT_DPI) * 25.4;
}

// 兼容各种属性命名来拿到插入点
function getInsertPoint(entity) {
    return (
        entity.insert ||
        entity.position ||
        entity.insertPoint ||
        entity.basePoint || { x: 0, y: 0 }
    );
}

// 旋转点（围绕 center）
export function rotatePointAround(p, center, angleDeg) {
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


// 设置 offset 偏移量
const OFFSET_X = 0;
const OFFSET_Y = 0;
// 转换canvas坐标 左上角为(0,0) 向右为x轴 向下为y轴 正数
export function getCanvasTransform(bounds, scale) {
    const transformX = x => (x - bounds.minX) * scale + OFFSET_X;
    const transformY = y => (bounds.maxY - y) * scale + OFFSET_Y;
    return {
        transformX,
        transformY,
    };
}

/**
 * 计算实体在 canvas 坐标系下的范围 (bounding box)
 * @param {object} entity - DXF 实体对象
 * @param {object} bounds - 实体的边界框
 * @param {number} scale - 缩放比例
 * @returns {{minX:number, minY:number, maxX:number, maxY:number}}
 */
export function getEntityCanvasBounds(entity, bounds, scale) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const { transformX, transformY } = getCanvasTransform(bounds, scale);

    const addPoint = (p) => {
        const x = transformX(p.x);
        const y = transformY(p.y);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
    };

    switch (entity.type) {
        case 'LINE':
            if (entity.vertices) entity.vertices.forEach(addPoint);
            break;

        case 'CIRCLE':
            if (entity.center && entity.radius !== undefined) {
                addPoint({ x: entity.center.x - entity.radius, y: entity.center.y - entity.radius });
                addPoint({ x: entity.center.x + entity.radius, y: entity.center.y + entity.radius });
            }
            break;

        case 'ARC':
            if (entity.center && entity.radius !== undefined) {
                // 取圆心 ± 半径的包络框（近似，但足够做边界）
                addPoint({ x: entity.center.x - entity.radius, y: entity.center.y - entity.radius });
                addPoint({ x: entity.center.x + entity.radius, y: entity.center.y + entity.radius });
            }
            break;

        case 'POLYLINE':
        case 'LWPOLYLINE':
            if (entity.vertices) entity.vertices.forEach(addPoint);
            break;

        case 'SPLINE':
            if (entity.controlPoints) entity.controlPoints.forEach(addPoint);
            break;

        case 'TEXT':
            if (entity.startPoint) addPoint(entity.startPoint);
            break;

        case 'INSERT':
            if (entity.position) {
                addPoint(entity.position);
            }
            break;

        default:
            console.warn("getEntityCanvasBounds: Unsupported entity type", entity.type);
    }

    return { minX, minY, maxX, maxY };
}

/**
 * 获取旋转后矩形 bounds 在新坐标系下的边界
 * @param bounds {minX, minY, maxX, maxY} 矩形边界
 * @param globalBounds {minX, minY, maxX, maxY} 全局边界
 * @param angleDeg 顺时针旋转角度（度）
 */
export function getEntityCanvasBoundsByCenter(bounds, globalBounds, angleDeg) {
    const { minX, minY, maxX, maxY } = bounds;
    const { minX: gMinX, minY: gMinY, maxX: gMaxX, maxY: gMaxY } = globalBounds;

    // 全局中心点
    const centerX = (gMinX + gMaxX) / 2;
    const centerY = (gMinY + gMaxY) / 2;

    const angleRad = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);

    // 矩形四个角点（全局坐标）
    const corners = [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY },
    ];

    // 旋转矩形角点
    const rotatedCorners = corners.map(p => {
        const dx = p.x - centerX;
        const dy = p.y - centerY;
        return {
            x: cos * dx - sin * dy + centerX,
            y: sin * dx + cos * dy + centerY
        };
    });

    // 旋转后的全局四个角，找到旋转后全局左上角
    const globalCorners = [
        { x: gMinX, y: gMinY },
        { x: gMaxX, y: gMinY },
        { x: gMaxX, y: gMaxY },
        { x: gMinX, y: gMaxY },
    ];

    const rotatedGlobalCorners = globalCorners.map(p => {
        const dx = p.x - centerX;
        const dy = p.y - centerY;
        return {
            x: cos * dx - sin * dy + centerX,
            y: sin * dx + cos * dy + centerY
        };
    });

    const globalMinX = Math.min(...rotatedGlobalCorners.map(p => p.x));
    const globalMinY = Math.min(...rotatedGlobalCorners.map(p => p.y));

    // 平移矩形到新坐标系（左上角为0,0）
    const translatedCorners = rotatedCorners.map(p => ({
        x: p.x - globalMinX,
        y: p.y - globalMinY
    }));

    const newMinX = Math.min(...translatedCorners.map(p => p.x));
    const newMinY = Math.min(...translatedCorners.map(p => p.y));
    const newMaxX = Math.max(...translatedCorners.map(p => p.x));
    const newMaxY = Math.max(...translatedCorners.map(p => p.y));

    return {
        newMinX,
        newMinY,
        newMaxX,
        newMaxY,
        translation: { x: -globalMinX, y: -globalMinY },
        rotatedCorners: translatedCorners
    };
}


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
    const halfStroke = getHalfStroke(strokeWidth);

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