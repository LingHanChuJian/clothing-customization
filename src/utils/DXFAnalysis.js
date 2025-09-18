import DxfParser from 'dxf-parser';

/**
 * DXF 文件解析，支持自动识别 $DWGCODEPAGE
 * @param {File} file - 浏览器 File 对象
 * @returns {Promise<object>} - 解析后的 dxf JSON
 */
export async function DXFAnalysis(file) {
  try {
    // 1. 读取二进制
    const arrayBuffer = await file.arrayBuffer();

    // 2. 粗略用 utf-8 解码，拿 header 找 $DWGCODEPAGE
    let textUtf8 = new TextDecoder('utf-8').decode(arrayBuffer);
    const codepage = getDWGCodePage(textUtf8);

    // 3. 映射成实际需要的编码
    const encoding = normalizeCodepage(codepage);

    // 4. 根据编码重新解码
    let text;
    if (encoding.toLowerCase() === 'gbk') {
      // 浏览器大多数支持 GB18030
      text = new TextDecoder('gb18030').decode(arrayBuffer);
    } else {
      text = new TextDecoder(encoding).decode(arrayBuffer);
    }

    // 5. 解析 DXF
    const parser = new DxfParser();
    const dxf = parser.parse(text);

    return dxf;
  } catch (error) {
    console.error('DXF解析错误:', error);
    throw new Error('DXF文件解析失败，请检查文件格式是否正确');
  }
}

/**
 * 提取 $DWGCODEPAGE 值
 */
function getDWGCodePage(text) {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '$DWGCODEPAGE') {
      const groupCode = lines[i + 1]?.trim();
      const value = lines[i + 2]?.trim();
      if (groupCode === '3' || groupCode === '2') {
        return value;
      }
    }
  }
  return null;
}

/**
 * codepage 映射表
 */
function normalizeCodepage(cp) {
  if (!cp) return 'utf-8';
  cp = cp.toLowerCase();

  // 常见映射
  if (cp === 'ansi_1252' || cp === 'iso8859-1') return 'gbk';
  if (cp === 'ansi_936') return 'gbk';
  if (cp.startsWith('ansi_')) return 'windows-' + cp.replace('ansi_', '');

  return cp;
}
