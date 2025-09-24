function toCamelCase(str) {
    return str.trim()
        .toLowerCase()
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
            return index === 0 ? word.toLowerCase() : word.toUpperCase();
        })
        .replace(/\s+/g, '');
}

export function convertToJSON(list) {
  return list.reduce((obj, item) => {
    const [key, value] = item.split(": ");
    obj[toCamelCase(key)] = value;
    return obj;
  }, {});
}

export function generateSloper(fileName, json) {
  console.log(fileName, json);

  const dotIndex = fileName.lastIndexOf("."); // 找到最后一个点的位置
  const fileNameWithoutExtension = fileName.slice(0, dotIndex);

  const sloperJson = {};

  // find(item => item.label === 'Size')
  const firstChild = json.children[0];
  const textsList = firstChild.textsList;
  const textSize = convertToJSON(textsList)['size'];

  sloperJson.file_info = {
    sloper_name: fileNameWithoutExtension,
    size: textSize ? textSize : "",
    update_time: new Date().toISOString(),
    sloper_type: 0,
    width: json.overall?.size.width,
    height: json.overall?.size.height,
  };

  sloperJson.cut = json.children.map((child) => {
    const { size, position, rotation, imageUrl } = child;

    const textsList = child.textsList;
    const textName = convertToJSON(textsList)['pieceName'];
    const curName = textName ? textName : "";
    const matchName = curName.match(/boke_(.*)/);
    const name = matchName ? matchName[1] : "未知裁片";

    const data = {
      name,
      size,
      position,
      rotation,
      zoom: 1,
      url: imageUrl,
    };

    return data;
  });

  return sloperJson;
}
