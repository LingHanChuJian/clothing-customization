function toCamelCase(str) {
  return str
    .trim()
    .replace(/[^a-zA-Z0-9_\s-]/g, '')  // 去掉非 key 字符
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));
}

export function convertToJSON(list) {
  return list.reduce((obj, item) => {
    const idx = item.indexOf(':');
    if (idx === -1) return obj;

    const key = toCamelCase(item.slice(0, idx)).toLowerCase();
    const value = item.slice(idx + 1).trim();

    if (key) obj[key] = value;
    return obj;
  }, {});
}

export function generateSloper(fileName, json) {
  console.log(fileName, json);

  const dotIndex = fileName.lastIndexOf("."); // 找到最后一个点的位置
  const fileNameWithoutExtension = fileName.slice(0, dotIndex);

  const sloperJson = {};

  let textSize = "";
  json.children.forEach(child => {
    const textsList = child.textsList;
    const size = convertToJSON(textsList)['size'];
    if (size) {
      textSize = size;
      return;
    }
  })

  sloperJson.file_info = {
    sloper_name: fileNameWithoutExtension,
    size: textSize ? textSize : "",
    update_time: new Date().toISOString(),
    sloper_type: 0,
    width: json.overall?.size.width,
    height: json.overall?.size.height,
  };

  sloperJson.cut = json.children.map((child) => {
    const { size, position, imageUrl } = child;

    const textsList = child.textsList;
    const textName = convertToJSON(textsList)['piecename'];
    const curName = textName ? textName : "";
    const matchName = curName.match(/_(.*)/);
    const name = matchName ? matchName[1] : curName;

    const data = {
      name,
      size,
      position,
      rotation: 0,
      zoom: 1,
      url: imageUrl,
    };

    return data;
  });

  return sloperJson;
}
