<template>
  <div class="batch-replace-colors">
    <h2>批量颜色替换</h2>

    <div 
      class="upload-area"
      :class="{ 'dragover': isDragOver }"
      @click="triggerFileInput"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragenter="handleDragEnter"
      @dragleave="handleDragLeave"
    >
      <div class="upload-icon">📁</div>
      <div class="upload-text">
        <p class="primary-text">点击此区域选择JSON文件</p>
        <p class="secondary-text">或拖拽JSON文件到此处</p>
        <p class="hint-text">支持多JSON文件批量上传</p>
      </div>
      <input 
        type="file" 
        ref="fileInput" 
        multiple 
        accept=".json"
        @change="handleFileUpload" 
        style="display: none;" 
      />
    </div>

    <!-- 上传消息 -->
    <div v-if="uploadMessage" class="upload-message" :class="messageType">{{ uploadMessage }}</div>

    <!-- 颜色替换界面 -->
    <div v-if="colorMappings.length > 0" class="color-editor">
      <h3>颜色替换设置</h3>
      
      <div v-for="(file, fileIndex) in colorMappings" :key="fileIndex" class="file-section">
        <div class="file-header">
          <h4>{{ file.fileName }}</h4>
          <span class="color-count">{{ file.colors.length }} 个颜色元素</span>
        </div>

        <!-- 横向表格形式的颜色编辑器 -->
        <div class="horizontal-color-table-container">
          <div class="table-wrapper">
            <table class="horizontal-color-table">
              <thead>
                <tr>
                  <!-- 每个颜色路径作为一列标题 -->
                  <th v-for="(colorItem, colorIndex) in file.colors" :key="colorIndex" class="color-column-header">
                    <div class="header-title">{{ colorItem.path }}</div>
                  </th>
                  <th class="actions-header">操作</th>
                </tr>
              </thead>
              <tbody>
                <!-- 第一行：原始颜色（不可编辑） -->
                <tr class="original-colors-row">
                  <td v-for="(colorItem, colorIndex) in file.colors" :key="colorIndex" class="color-cell original-color">
                    <div class="color-cell-content">
                      <div 
                        class="color-preview" 
                        :style="{ backgroundColor: colorItem.originalColor }"
                      ></div>
                      <span class="color-value">{{ colorItem.originalColor }}</span>
                    </div>
                  </td>
                  <td class="actions-cell">
                    <span class="original-tag">原色</span>
                  </td>
                </tr>
                
                <!-- 新颜色行 -->
                <tr v-for="(row, rowIndex) in getColorRows(file.colors)" :key="rowIndex" class="new-colors-row">
                  <td v-for="(colorItem, colorIndex) in file.colors" :key="colorIndex" class="color-cell">
                    <div v-if="colorItem.newColors[rowIndex]" class="color-cell-content">
                      <!-- 编辑状态 -->
                      <div v-if="colorItem.newColors[rowIndex].editing" class="color-picker-section">
                        <ColorPicker 
                          v-model:pureColor="colorItem.newColors[rowIndex].tempValue"
                          format="rgb"
                          :disableAlpha="false"
                          shape="circle"
                          size="small"
                          @change="onInlineColorChange(fileIndex, colorIndex, rowIndex, $event)"
                        />
                      </div>
                      <div v-if="colorItem.newColors[rowIndex].editing" class="color-input-section">
                        <input 
                          v-model="colorItem.newColors[rowIndex].tempValue"
                          @keyup.enter="saveColorEdit(fileIndex, colorIndex, rowIndex)"
                          @keyup.esc="cancelColorEdit(fileIndex, colorIndex, rowIndex)"
                          class="color-input"
                          placeholder="颜色值"
                          ref="colorInputs"
                        />
                      </div>
                      <!-- 显示状态 -->
                      <div v-else class="display-cell">
                        <div 
                          v-if="colorItem.newColors[rowIndex].value && colorItem.newColors[rowIndex].value !== 'null'" 
                          class="color-preview" 
                          :style="{ backgroundColor: colorItem.newColors[rowIndex].value }"
                        ></div>
                        <div v-else class="color-preview empty-color">?</div>
                        <span class="color-value">{{ colorItem.newColors[rowIndex].value || 'null' }}</span>
                      </div>
                    </div>
                    <div v-else class="empty-cell"></div>
                  </td>
                  <td class="actions-cell">
                    <div class="row-actions">
                      <template v-if="hasEditingInRow(file.colors, rowIndex)">
                        <button @click="confirmEditRow(fileIndex, rowIndex)" class="confirm-btn">确认</button>
                      </template>
                      <template v-else>
                        <button @click="editRow(fileIndex, rowIndex)" class="modify-btn">修改</button>
                      </template>
                      <button @click="deleteRow(fileIndex, rowIndex)" class="delete-row-btn">删除</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- 添加新颜色行按钮 -->
          <div class="add-row-section">
            <button @click="addNewColorRow(fileIndex)" class="add-row-btn">+ 添加新颜色</button>
          </div>
        </div>
      </div>


      <div class="actions">
        <button class="clear-btn" @click="clearAll">清空所有</button>
        <button class="generate-btn" @click="generateStyleJson">生成 Style JSON zip</button>
      </div>
    </div>

    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">处理中...</div>
    </div>
  </div>
</template>

<script lang="js">
import { ColorPicker } from 'vue3-colorpicker'
import 'vue3-colorpicker/style.css'
import JSZip from 'jszip'

export default {
  name: 'BatchReplaceColors',
  components: {
    ColorPicker
  },
  data() {
    return {
      uploadedFiles: [],
      loading: false,
      isDragOver: false,
      uploadMessage: '',
      messageType: 'info', // 可以是 'info', 'warning', 'error', 'success'
      colorMappings: [], // 存储文件和颜色映射关系
      originalJsonData: [], // 存储原始JSON数据
      selectedColorPath: '' // 选中的颜色路径
    }
  },
  methods: {
    triggerFileInput() {
      this.$refs.fileInput.click();
    },

    handleFileUpload(event) {
      const files = Array.from(event.target.files);
      this.addFiles(files);
      // 清空input值，允许重复选择相同文件
      event.target.value = '';
    },

    handleDrop(event) {
      event.preventDefault();
      this.isDragOver = false;
      
      // 优先使用 dataTransfer.items 来处理文件和文件夹
      const items = Array.from(event.dataTransfer.items);
      
      if (items.length > 0) {
        // 处理拖拽的文件和文件夹
        const promises = items.map(item => {
          if (item.kind === 'file') {
            const entry = item.webkitGetAsEntry();
            if (entry) {
              return this.traverseFileTree(entry);
            }
          }
          return Promise.resolve([]);
        });
        
        Promise.all(promises).then(results => {
          const allFiles = results.flat();
          this.addFiles(allFiles);
        });
      } else {
        // 兜底：如果 items 不可用，使用 files（仅支持直接文件拖拽）
        const droppedFiles = Array.from(event.dataTransfer.files);
        if (droppedFiles.length > 0) {
          this.addFiles(droppedFiles);
        }
      }
    },

    // 递归遍历文件夹
    traverseFileTree(item, path = '') {
      return new Promise((resolve) => {
        if (item.isFile) {
          item.file(file => {
            resolve([file]);
          });
        } else if (item.isDirectory) {
          const dirReader = item.createReader();
          dirReader.readEntries(entries => {
            const promises = entries.map(entry => 
              this.traverseFileTree(entry, path + item.name + '/')
            );
            Promise.all(promises).then(results => {
              resolve(results.flat());
            });
          });
        } else {
          resolve([]);
        }
      });
    },

    handleDragOver(event) {
      event.preventDefault();
      this.isDragOver = true;
    },

    handleDragEnter(event) {
      event.preventDefault();
      this.isDragOver = true;
    },

    handleDragLeave(event) {
      event.preventDefault();
      // 只有当拖拽完全离开区域时才取消高亮
      if (!event.currentTarget.contains(event.relatedTarget)) {
        this.isDragOver = false;
      }
    },

    async addFiles(files) {
      const validFiles = [];
      const invalidFiles = [];
      
      for (const file of files) {
        // 检查文件格式是否为JSON
        if (file.name.toLowerCase().endsWith('.json')) {
          // 检查是否已经存在相同的文件
          const exists = this.uploadedFiles.some(existingFile => 
            existingFile.name === file.name && existingFile.size === file.size
          );
          
          if (!exists) {
            this.uploadedFiles.push(file);
            validFiles.push(file);
            
            // 立即解析文件
            try {
              await this.parseJsonFile(file);
            } catch (error) {
              console.error(`解析文件 ${file.name} 失败:`, error);
              this.uploadMessage = `解析文件 ${file.name} 失败`;
              this.messageType = 'error';
            }
          }
        } else {
          invalidFiles.push(file);
        }
      }
      
      // 显示添加结果
      if (validFiles.length > 0) {
        console.log(`已添加 ${validFiles.length} 个JSON文件，总计 ${this.uploadedFiles.length} 个文件`);
      }
      
      // 显示无效文件警告
      if (invalidFiles.length > 0) {
        console.warn(`已忽略 ${invalidFiles.length} 个非JSON文件`);
        if (invalidFiles.length === files.length) {
          // 如果所有文件都是无效的，显示提示
          this.uploadMessage = '只支持上传JSON格式的文件，请重新选择';
          this.messageType = 'error';
        } else if (validFiles.length > 0) {
          // 如果有部分有效文件，显示部分成功的提示
          this.uploadMessage = `已添加 ${validFiles.length} 个JSON文件，已忽略 ${invalidFiles.length} 个非JSON文件`;
          this.messageType = 'warning';
        }
      } else if (validFiles.length > 0) {
        // 如果全部是有效文件，显示成功提示
        this.uploadMessage = `成功添加 ${validFiles.length} 个JSON文件，解析完成`;
        this.messageType = 'success';
      }
    },

    clearAll() {
      this.uploadedFiles = [];
      this.uploadMessage = '';
      this.colorMappings = [];
      this.originalJsonData = [];
    },

    // 解析JSON文件
    async parseJsonFile(file) {
      const text = await this.readFileAsText(file);
      const jsonData = JSON.parse(text);
      
      // 存储原始数据
      this.originalJsonData.push({
        fileName: file.name,
        data: jsonData
      });
      
      // 解析颜色信息
      const colors = this.extractColors(jsonData, file.name);
      
      this.colorMappings.push({
        fileName: file.name,
        colors: colors
      });
    },

    // 提取颜色信息
    extractColors(data, fileName) {
      const colors = [];
      
      // 检查data是否为数组
      if (Array.isArray(data)) {
        // 遍历data数组中的每个元素
        data.forEach((item, itemIndex) => {
          if (item.title) {
            // 遍历当前item的layers
            if (item.layers && Array.isArray(item.layers)) {
              item.layers.forEach((layer, layerIndex) => {
                if (layer.title && layer.content && layer.content.resource) {
                  const layerPath = `${item.title} > ${layer.title}`;
                  this.extractColorsFromResource(layer.content.resource, colors, layerPath, `[${itemIndex}].layers[${layerIndex}].content.resource`);
                }
              });
            }
          }
        });
      } else {
        // 如果data不是数组，保持原来的逻辑
      if (data.title) {
        // 遍历layers
        if (data.layers && Array.isArray(data.layers)) {
          data.layers.forEach((layer, layerIndex) => {
            if (layer.title && layer.content && layer.content.resource) {
              const layerPath = `${data.title} > ${layer.title}`;
              this.extractColorsFromResource(layer.content.resource, colors, layerPath, `layers[${layerIndex}].content.resource`);
            }
          });
          }
        }
      }
      
      return colors;
    },

    // 从resource中提取颜色
    extractColorsFromResource(resource, colors, basePath, jsonPath) {
      if (!resource) return;
      
      if (resource.type === 'text' && resource.font) {
        // 处理text类型的fill颜色
        if (resource.font.fill) {
          colors.push({
            path: `${basePath} > 文字填充色`,
            type: 'text-fill',
            originalColor: resource.font.fill,
            newColors: [], // 新的数据结构：存储多个新颜色
            jsonPath: `${jsonPath}.font.fill`
          });
        }
        
        // 处理outStrokes数组
        if (resource.font.outStrokes && Array.isArray(resource.font.outStrokes) && resource.font.outStrokes.length > 0) {
          resource.font.outStrokes.forEach((stroke, strokeIndex) => {
            if (stroke.color) {
              colors.push({
                path: `${basePath} > 描边色 ${strokeIndex + 1}`,
                type: 'text-stroke',
                originalColor: stroke.color,
                newColors: [],
                jsonPath: `${jsonPath}.font.outStrokes[${strokeIndex}].color`
              });
            }
          });
        }
      } else if (resource.type === 'image') {
        // 处理image类型的foreground和background
        if (resource.foreground !== null && resource.foreground !== undefined) {
          colors.push({
            path: `${basePath} > 前景色`,
            type: 'image-foreground',
            originalColor: resource.foreground,
            newColors: [],
            jsonPath: `${jsonPath}.foreground`
          });
        }
        
        if (resource.background !== null && resource.background !== undefined) {
          colors.push({
            path: `${basePath} > 背景色`,
            type: 'image-background',
            originalColor: resource.background,
            newColors: [],
            jsonPath: `${jsonPath}.background`
          });
        }
      } else if (resource.type === 'color' && resource.color) {
        // 处理color类型
        colors.push({
          path: `${basePath} > 颜色`,
          type: 'color',
          originalColor: resource.color,
          newColors: [],
          jsonPath: `${jsonPath}.color`
        });
      } else if (resource.type === 'group' && resource.group && Array.isArray(resource.group)) {
        // 处理group类型，递归遍历
        resource.group.forEach((groupItem, groupIndex) => {
          const groupPath = `${basePath} > 组合元素 ${groupIndex + 1}`;
          const groupJsonPath = `${jsonPath}.group[${groupIndex}]`;
          
          if (groupItem.type === 'text' && groupItem.font) {
            // group中的text类型
            if (groupItem.font.fill) {
              colors.push({
                path: `${groupPath} > 文字填充色`,
                type: 'group-text-fill',
                originalColor: groupItem.font.fill,
                newColors: [],
                jsonPath: `${groupJsonPath}.font.fill`
              });
            }
            
            if (groupItem.font.outStrokes && Array.isArray(groupItem.font.outStrokes) && groupItem.font.outStrokes.length > 0) {
              groupItem.font.outStrokes.forEach((stroke, strokeIndex) => {
                if (stroke.color) {
                  colors.push({
                    path: `${groupPath} > 描边色 ${strokeIndex + 1}`,
                    type: 'group-text-stroke',
                    originalColor: stroke.color,
                    newColors: [],
                    jsonPath: `${groupJsonPath}.font.outStrokes[${strokeIndex}].color`
                  });
                }
              });
            }
          } else if (groupItem.type === 'image') {
            // group中的image类型
            if (groupItem.foreground !== null && groupItem.foreground !== undefined) {
              colors.push({
                path: `${groupPath} > 前景色`,
                type: 'group-image-foreground',
                originalColor: groupItem.foreground,
                newColors: [],
                jsonPath: `${groupJsonPath}.foreground`
              });
            }
            
            if (groupItem.background !== null && groupItem.background !== undefined) {
              colors.push({
                path: `${groupPath} > 背景色`,
                type: 'group-image-background',
                originalColor: groupItem.background,
                newColors: [],
                jsonPath: `${groupJsonPath}.background`
              });
            }
          }
        });
      }
    },

    // 生成Style JSON
    async generateStyleJson() {
      if (this.colorMappings.length === 0) {
        this.uploadMessage = '没有可处理的颜色数据';
        this.messageType = 'warning';
        return;
      }

      try {
        // 创建ZIP实例
        const zip = new JSZip();
        let totalFilesGenerated = 0;

        this.colorMappings.forEach((fileMapping, fileIndex) => {
          // 获取最大行数（除去原始颜色行）
          const maxRows = Math.max(...fileMapping.colors.map(color => color.newColors.length), 0);
          
          if (maxRows === 0) {
            console.log(`文件 ${fileMapping.fileName} 没有编辑的颜色行，跳过`);
            return;
          }

          // 为每一行生成一个JSON文件
          for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
            // 深拷贝原始数据，确保不修改原始数据
            const originalData = JSON.parse(JSON.stringify(this.originalJsonData[fileIndex].data));
            
            // 应用当前行的颜色变更
            let hasValidColor = false;
            fileMapping.colors.forEach(colorItem => {
              if (colorItem.newColors[rowIndex]) {
                const newColorValue = colorItem.newColors[rowIndex].value;
                
                // 如果有新颜色值且不为null，则替换
                if (newColorValue !== null && newColorValue !== undefined && newColorValue !== '' && newColorValue !== 'null') {
                  this.updateJsonValue(originalData, colorItem.jsonPath, newColorValue);
                  hasValidColor = true;
                }
                // 如果没有设置新颜色，保留原颜色（不做任何操作）
              }
            });

            // 只有当该行至少有一个有效颜色时才生成文件
            if (hasValidColor) {
              const fileName = `style${totalFilesGenerated + 1}.json`;
              const jsonString = JSON.stringify(originalData, null, 2);
              zip.file(fileName, jsonString);
              totalFilesGenerated++;
            }
          }
        });

        if (totalFilesGenerated === 0) {
          this.uploadMessage = '没有有效的颜色数据可以生成JSON文件';
          this.messageType = 'warning';
          return;
        }

        // 生成ZIP文件并下载
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        this.downloadZip(zipBlob, 'style_jsons.zip');
        
        this.uploadMessage = `已生成并下载包含 ${totalFilesGenerated} 个JSON文件的ZIP压缩包`;
        this.messageType = 'success';
      } catch (error) {
        console.error('生成JSON失败:', error);
        this.uploadMessage = '生成JSON失败，请重试';
        this.messageType = 'error';
      }
    },

    // 更新JSON中的值
    updateJsonValue(obj, path, newValue) {
      try {
        const keys = path.split('.');
        let current = obj;
        
        for (let i = 0; i < keys.length - 1; i++) {
          const key = keys[i];
          
          if (key.includes('[') && key.includes(']')) {
            // 处理数组索引
            const [arrayKey, indexStr] = key.split('[');
            const index = parseInt(indexStr.replace(']', ''));
            
            // 如果arrayKey为空字符串，说明路径直接以[0]开始，current本身就是数组
            if (arrayKey === '') {
              if (!Array.isArray(current) || current.length <= index) {
                console.error(`Array index ${index} is out of bounds for path: ${path}`);
                return;
              }
              current = current[index];
            } else {
              if (!current[arrayKey] || !Array.isArray(current[arrayKey]) || current[arrayKey].length <= index) {
                console.error(`Invalid array access: ${arrayKey}[${index}] for path: ${path}`);
                return;
              }
              current = current[arrayKey][index];
            }
          } else {
            if (!current.hasOwnProperty(key)) {
              console.error(`Key '${key}' not found for path: ${path}`);
              return;
            }
            current = current[key];
          }
        }
        
        const finalKey = keys[keys.length - 1];
        
        if (finalKey.includes('[') && finalKey.includes(']')) {
          const [arrayKey, indexStr] = finalKey.split('[');
          const index = parseInt(indexStr.replace(']', ''));
          
          // 如果arrayKey为空字符串，说明最终键直接是[0]格式，current本身就是数组
          if (arrayKey === '') {
            if (!Array.isArray(current) || current.length <= index) {
              console.error(`Final array index ${index} is out of bounds for path: ${path}`);
              return;
            }
            current[index] = newValue;
          } else {
            if (!current[arrayKey] || !Array.isArray(current[arrayKey]) || current[arrayKey].length <= index) {
              console.error(`Invalid final array access: ${arrayKey}[${index}] for path: ${path}`);
              return;
            }
            current[arrayKey][index] = newValue;
          }
        } else {
          if (!current.hasOwnProperty(finalKey)) {
            console.error(`Final key '${finalKey}' not found for path: ${path}`);
            return;
          }
          current[finalKey] = newValue;
        }
      } catch (error) {
        console.error('Error updating JSON path:', path, 'with value:', newValue);
        console.error('Error details:', error);
      }
    },

    // 下载JSON文件
    downloadJson(data, filename) {
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      }, 100);
    },

    // 下载ZIP文件
    downloadZip(zipBlob, filename) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(zipBlob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      }, 100);
    },

    readFileAsText(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });
    },

    formatFileSize(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    getFileExtension(filename) {
      return filename.split('.').pop().toUpperCase();
    },

    // 添加新颜色
    addNewColor(fileIndex, colorIndex) {
      this.colorMappings[fileIndex].colors[colorIndex].newColors.push({
        value: null,
        editing: false,
        tempValue: ''
      });
    },

    // 添加新颜色到选中的路径
    addNewColorToSelected() {
      if (!this.selectedColorPath) return;
      
      const [fileIndex, colorIndex] = this.selectedColorPath.split('-').map(Number);
      this.addNewColor(fileIndex, colorIndex);
      this.selectedColorPath = ''; // 重置选择
    },

    // 获取颜色行数据（用于横向表格）
    getColorRows(colors) {
      if (!colors || colors.length === 0) return [];
      const maxRows = Math.max(...colors.map(color => color.newColors.length), 0);
      return Array.from({ length: maxRows }, (_, index) => index);
    },

    // 添加新颜色行（为所有颜色列添加新的空白行）
    addNewColorRow(fileIndex) {
      this.colorMappings[fileIndex].colors.forEach(colorItem => {
        colorItem.newColors.push({
          value: null,
          editing: true,  // 默认为编辑状态
          tempValue: colorItem.originalColor  // 默认使用第一行的原始颜色
        });
      });
    },

    // 删除颜色行
    deleteRow(fileIndex, rowIndex) {
      this.colorMappings[fileIndex].colors.forEach(colorItem => {
        if (colorItem.newColors[rowIndex]) {
          colorItem.newColors.splice(rowIndex, 1);
        }
      });
    },

    // 编辑颜色
    editColor(fileIndex, colorIndex, newColorIndex) {
      const newColor = this.colorMappings[fileIndex].colors[colorIndex].newColors[newColorIndex];
      newColor.editing = true;
      newColor.tempValue = newColor.value || '';
      
      // 聚焦到输入框
      this.$nextTick(() => {
        const inputs = this.$refs.colorInputs;
        if (inputs && inputs.length > 0) {
          const targetInput = inputs[inputs.length - 1]; // 获取最后一个输入框
          targetInput.focus();
        }
      });
    },

    // 处理输入框失焦事件
    handleBlur(fileIndex, colorIndex, newColorIndex, event) {
      // 如果失焦是因为点击了调色板按钮，则不保存
      if (event.relatedTarget && event.relatedTarget.classList.contains('color-picker-trigger')) {
        return;
      }
      this.saveColorEdit(fileIndex, colorIndex, newColorIndex);
    },

    // 保存颜色编辑
    saveColorEdit(fileIndex, colorIndex, newColorIndex) {
      const newColor = this.colorMappings[fileIndex].colors[colorIndex].newColors[newColorIndex];
      const colorValue = newColor.tempValue.trim();
      
      // 验证颜色值
      if (colorValue === '' || colorValue === 'null') {
        newColor.value = null;
      } else if (this.isValidColor(colorValue)) {
        newColor.value = colorValue;
      } else {
        this.uploadMessage = `无效的颜色格式: ${colorValue}，请使用 #xxx, rgb() 或 rgba() 格式`;
        this.messageType = 'error';
        return; // 不保存无效的颜色
      }
      
      newColor.editing = false;
      newColor.tempValue = '';
    },

    // 取消颜色编辑
    cancelColorEdit(fileIndex, colorIndex, newColorIndex) {
      const newColor = this.colorMappings[fileIndex].colors[colorIndex].newColors[newColorIndex];
      newColor.editing = false;
      newColor.tempValue = '';
    },

    // 删除颜色
    deleteColor(fileIndex, colorIndex, newColorIndex) {
      this.colorMappings[fileIndex].colors[colorIndex].newColors.splice(newColorIndex, 1);
    },

    // 验证颜色格式
    isValidColor(color) {
      if (!color) return false;
      
      // 十六进制颜色格式 #xxx 或 #xxxxxx
      const hexRegex = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/;
      if (hexRegex.test(color)) return true;
      
      // RGB 格式 rgb(r, g, b)
      const rgbRegex = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/;
      if (rgbRegex.test(color)) {
        const matches = color.match(rgbRegex);
        const r = parseInt(matches[1]);
        const g = parseInt(matches[2]);
        const b = parseInt(matches[3]);
        return r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255;
      }
      
      // RGBA 格式 rgba(r, g, b, a)
      const rgbaRegex = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(0?\.\d+|1|0)\s*\)$/;
      if (rgbaRegex.test(color)) {
        const matches = color.match(rgbaRegex);
        const r = parseInt(matches[1]);
        const g = parseInt(matches[2]);
        const b = parseInt(matches[3]);
        const a = parseFloat(matches[4]);
        return r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255 && a >= 0 && a <= 1;
      }
      
      return false;
    },

    // 内联颜色选择器变化
    onInlineColorChange(fileIndex, colorIndex, rowIndex, color) {
      // 实时更新临时值
      this.colorMappings[fileIndex].colors[colorIndex].newColors[rowIndex].tempValue = color;
    },

    // 检查某行是否有正在编辑的单元格
    hasEditingInRow(colors, rowIndex) {
      return colors.some(colorItem => 
        colorItem.newColors[rowIndex] && colorItem.newColors[rowIndex].editing
      );
    },

    // 编辑整行
    editRow(fileIndex, rowIndex) {
      this.colorMappings[fileIndex].colors.forEach(colorItem => {
        if (colorItem.newColors[rowIndex]) {
          colorItem.newColors[rowIndex].editing = true;
          colorItem.newColors[rowIndex].tempValue = colorItem.newColors[rowIndex].value || colorItem.originalColor;
        }
      });
    },

    // 确认编辑整行
    confirmEditRow(fileIndex, rowIndex) {
      this.colorMappings[fileIndex].colors.forEach(colorItem => {
        if (colorItem.newColors[rowIndex] && colorItem.newColors[rowIndex].editing) {
          this.saveColorEdit(fileIndex, this.colorMappings[fileIndex].colors.indexOf(colorItem), rowIndex);
        }
      });
    }
  }
}
</script>

<style scoped>
.batch-replace-colors {
  max-width: 1500px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

h2 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
}

.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 40px;
  border: 3px dashed #ccc;
  border-radius: 10px;
  background-color: #fafafa;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 30px;
}

.upload-area:hover {
  border-color: #4CAF50;
  background-color: #f0f8f0;
}

.upload-area.dragover {
  border-color: #4CAF50;
  background-color: #e8f5e8;
  transform: scale(1.02);
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 20px;
  opacity: 0.6;
}

.upload-text {
  text-align: center;
}

.primary-text {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin: 0 0 10px 0;
}

.secondary-text {
  font-size: 16px;
  color: #666;
  margin: 0 0 10px 0;
}

.hint-text {
  font-size: 14px;
  color: #999;
  margin: 0;
}

.file-list-container {
  background-color: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.file-list-container h3 {
  margin: 0 0 15px 0;
  color: #333;
}

.file-list {
  max-height: 300px;
  overflow-y: auto;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: white;
  border: 1px solid #eee;
  border-radius: 4px;
  margin-bottom: 8px;
}

.file-info {
  flex: 1;
}

.file-name {
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.file-details {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #666;
}

.remove-btn {
  background-color: #ff4444;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-btn:hover {
  background-color: #cc0000;
}

.actions {
  display: flex;
  justify-content: space-between;
  margin-top: 15px;
  gap: 10px;
}

.clear-btn, .process-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: background-color 0.2s;
}

.clear-btn {
  background-color: #ff9800;
  color: white;
}

.clear-btn:hover {
  background-color: #e68a00;
}

.generate-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: background-color 0.2s;
}

.generate-btn:hover {
  background-color: #45a049;
}

/* 颜色编辑器样式 */
.color-editor {
  margin-top: 30px;
}

.color-editor h3 {
  text-align: center;
  margin-bottom: 25px;
  color: #333;
  font-size: 20px;
}

/* 横向表格样式 */
.horizontal-color-table-container {
  margin-bottom: 30px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
}

.table-wrapper {
  overflow-x: auto;
}

.horizontal-color-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  min-width: 800px; /* 确保表格有足够宽度 */
}

.horizontal-color-table th,
.horizontal-color-table td {
  padding: 8px 12px;
  text-align: center;
  border-bottom: 1px solid #e0e0e0;
  border-right: 1px solid #e0e0e0;
  vertical-align: middle;
}

.horizontal-color-table th {
  background-color: #f1f3f4;
  font-weight: bold;
  color: #333;
  position: sticky;
  top: 0;
  z-index: 10;
}

.color-column-header {
  min-width: 220px;
  max-width: 300px;
  word-break: break-word;
}

.header-title {
  font-size: 13px;
  line-height: 1.3;
  padding: 5px 0;
}

.original-colors-row {
  background-color: #f8f9fa;
}

.original-colors-row .color-cell {
  background-color: #f8f9fa;
}

.new-colors-row:hover {
  background-color: #f9f9f9;
}

.color-preview-header {
  width: 80px;
  text-align: center;
}

.color-value-header {
  min-width: 200px;
}

.actions-header {
  width: 120px;
  text-align: center;
  position: sticky;
  right: 0;
  background-color: #f1f3f4;
  z-index: 11;
  border-left: 2px solid #ddd;
}

.original-color-row {
  background-color: #f8f9fa;
}

.original-color-row .color-preview-cell,
.original-color-row .color-value-cell,
.original-color-row .actions-cell {
  background-color: #f8f9fa;
}

.new-color-row:hover {
  background-color: #f9f9f9;
}

.color-preview-cell {
  text-align: center;
}

.color-preview {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  border: 2px solid #ddd;
  margin: 0 auto;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-color {
  background-color: #f5f5f5;
  color: #999;
  font-weight: bold;
  font-size: 18px;
}

.color-value-cell {
  font-family: 'Courier New', monospace;
}

.color-input-wrapper {
  display: flex;
  gap: 5px;
  align-items: center;
}

.color-input {
  flex: 1;
  padding: 8px 12px;
  border: 2px solid #4CAF50;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  outline: none;
}

.color-input:focus {
  border-color: #45a049;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.color-picker-trigger {
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.color-picker-trigger:hover {
  background-color: #f0f0f0;
  border-color: #4CAF50;
}

.actions-cell {
  text-align: center;
  position: sticky;
  right: 0;
  background-color: inherit;
  z-index: 10;
  border-left: 2px solid #ddd;
  width: 120px;
  min-width: 120px;
  max-width: 120px;
}

.original-colors-row .actions-cell {
  background-color: #f8f9fa;
}

.new-colors-row .actions-cell {
  background-color: white;
}

.new-colors-row:hover .actions-cell {
  background-color: #f9f9f9;
}

.edit-actions {
  display: flex;
  gap: 5px;
  margin-bottom: 5px;
}

.edit-btn, .delete-btn, .save-btn, .cancel-btn {
  padding: 4px 8px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  font-weight: bold;
  transition: background-color 0.2s;
}

.edit-btn {
  background-color: #2196F3;
  color: white;
  margin-bottom: 5px;
}

.edit-btn:hover {
  background-color: #1976D2;
}

.delete-btn {
  background-color: #f44336;
  color: white;
}

.delete-btn:hover {
  background-color: #d32f2f;
}

.delete-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.save-btn {
  background-color: #4CAF50;
  color: white;
}

.save-btn:hover {
  background-color: #45a049;
}

.cancel-btn {
  background-color: #ff9800;
  color: white;
}

.cancel-btn:hover {
  background-color: #f57c00;
}

.original-tag {
  background-color: #e3f2fd;
  color: #1565c0;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: bold;
}

.add-color-btn {
  width: 100%;
  padding: 12px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 0 0 8px 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: background-color 0.2s;
}

.add-color-btn:hover {
  background-color: #45a049;
}

/* 统一表格特定样式 */
.title-cell {
  font-weight: bold;
  color: #333;
  word-break: break-word;
  max-width: 400px;
}

.secondary-title {
  font-weight: normal;
  color: #666;
  font-size: 13px;
  font-style: italic;
}

.add-color-section {
  display: flex;
  gap: 10px;
  padding: 15px 20px;
  background-color: #f8f9fa;
  border-top: 1px solid #e0e0e0;
  align-items: center;
}

.color-path-select {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
}

.color-path-select:focus {
  border-color: #4CAF50;
  outline: none;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.add-selected-color-btn {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.add-selected-color-btn:hover:not(:disabled) {
  background-color: #45a049;
}

.add-selected-color-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

/* 横向表格颜色单元格样式 */
.color-cell {
  position: relative;
  min-height: 60px;
}

.color-cell.editing {
  min-height: 120px;
}

.color-cell-content {
  display: grid;
  grid-template-columns: 40px 1fr;
  align-items: center;
  gap: 8px;
}

.display-cell {
  border-radius: 4px;
  padding: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.empty-cell {
  height: 40px;
  background-color: #f5f5f5;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-style: italic;
}

.empty-cell::after {
  content: '—';
}

/* 颜色预览在单元格中的样式 */
.color-cell .color-preview {
  width: 30px;
  height: 30px;
  border-radius: 4px;
  border: 2px solid #ddd;
  flex-shrink: 0;
}

.color-cell .color-value {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: #666;
  word-break: break-all;
  max-width: 80px;
  text-align: left;
}

.color-picker-section {
  flex-shrink: 0;
}

.color-input-section {
  flex: 1;
  min-width: 0;
}

.color-cell .color-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 3px;
  font-size: 12px;
  font-family: 'Courier New', monospace;
  text-align: center;
}

.color-cell .color-input:focus {
  border-color: #4CAF50;
  outline: none;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.color-input {
  padding: 8px 0 !important;
}

.row-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}

.modify-btn, .confirm-btn {
  padding: 4px 8px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  font-weight: bold;
  min-width: 50px;
  transition: background-color 0.2s;
}

.modify-btn {
  background-color: #2196F3;
  color: white;
}

.modify-btn:hover {
  background-color: #1976D2;
}

.confirm-btn {
  background-color: #4CAF50;
  color: white;
}

.confirm-btn:hover {
  background-color: #45a049;
}

/* 添加行按钮 */
.add-row-section {
  padding: 15px 20px;
  background-color: #f8f9fa;
  border-top: 1px solid #e0e0e0;
  text-align: center;
}

.add-row-btn {
  width: 100%;
  padding: 12px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: background-color 0.2s;
}

.add-row-btn:hover {
  background-color: #45a049;
}

.delete-row-btn {
  padding: 4px 8px;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  font-weight: bold;
  min-width: 50px;
  transition: background-color 0.2s;
}

.delete-row-btn:hover {
  background-color: #d32f2f;
}


.file-section {
  background-color: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 25px;
}

.file-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #e0e0e0;
}

.file-header h4 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.color-count {
  background-color: #e3f2fd;
  color: #1565c0;
  padding: 4px 12px;
  border-radius: 15px;
  font-size: 12px;
  font-weight: bold;
}

.color-item {
  background-color: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.color-path {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.path-text {
  font-weight: bold;
  color: #333;
  font-size: 14px;
}

.color-type {
  background-color: #f0f4f8;
  color: #2d3748;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: bold;
}

.color-controls {
  display: flex;
  align-items: center;
}

.color-pair {
  display: flex;
  align-items: center;
  gap: 20px;
  width: 100%;
}

.color-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.color-section label {
  font-size: 12px;
  color: #666;
  font-weight: bold;
}

.color-display {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-preview {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 2px solid #ddd;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.color-picker-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-value {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #666;
  background-color: #f8f9fa;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #e9ecef;
  min-width: 120px;
}

.arrow {
  font-size: 20px;
  color: #4CAF50;
  font-weight: bold;
  margin: 0 15px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .color-pair {
    flex-direction: column;
    gap: 15px;
  }
  
  .arrow {
    transform: rotate(90deg);
    margin: 10px 0;
  }
  
  .file-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}

.upload-message {
  padding: 10px 15px;
  border-radius: 4px;
  margin-bottom: 15px;
  font-size: 14px;
  display: flex;
  align-items: center;
}

.upload-message.info {
  background-color: #e3f2fd;
  color: #0d47a1;
  border-left: 4px solid #2196f3;
}

.upload-message.success {
  background-color: #e8f5e9;
  color: #1b5e20;
  border-left: 4px solid #4caf50;
}

.upload-message.warning {
  background-color: #fff8e1;
  color: #ff8f00;
  border-left: 4px solid #ffc107;
}

.upload-message.error {
  background-color: #ffebee;
  color: #b71c1c;
  border-left: 4px solid #f44336;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  margin-top: 10px;
  color: white;
  font-size: 18px;
}

:deep(.vc-color-wrap) {
  margin-right: 0;
}

:deep(.vc-color-wrap.round) {
  width: 30px;
  height: 30px;
  border-radius: inherit;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>