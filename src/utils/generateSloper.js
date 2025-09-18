export function generateSloper(fileName, json) {
    console.log(fileName, json)
    // const sloper = fileName.match(/^(.*)-(.*)\.dxf$/)
    // if (!sloper) {
    //     throw new Error('文件名格式不正确, 正确格式 {filename}-{size}.dxf')
    // }
    // const [, sloperName, size] = sloper

    const dotIndex = fileName.lastIndexOf('.'); // 找到最后一个点的位置
    const fileNameWithoutExtension = fileName.slice(0, dotIndex);

    const sloperJson = {}

    const firstChild = json.children[0]
    const textSize = firstChild.texts.find(item => item.label === 'Size')

    sloperJson.file_info = {
        sloper_name: fileNameWithoutExtension,
        size: textSize ? textSize.value : '',
        update_time: new Date().toISOString(),
        sloper_type: 0,
        width: json.overall.size.width,
        height: json.overall.size.height
    }
    
    sloperJson.cut = json.children.map(child => {
        const { size, position, rotation, imageUrl } = child

        const textName = child.texts.find(item => item.label === 'Piece Name')
        const curName = textName ? textName.value : ''
        const matchName = curName.match(/boke_(.*)/)
        const name = matchName ? matchName[1] : '未知裁片'

        const data = {
            name,
            size,
            position,
            rotation,
            zoom: 1,
            url: imageUrl
        }

        return data
    })

    

    return sloperJson
}
