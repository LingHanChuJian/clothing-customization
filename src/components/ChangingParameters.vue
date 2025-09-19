<template>
  <div class="changing-parameters">
    <h2>Sloper JSON 参数(Zoom)修改</h2>

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
        <p class="primary-text">点击此区域选择文件</p>
        <p class="secondary-text">或拖拽文件/文件夹到此处</p>
        <p class="hint-text">支持多Sloper JSON文件批量上传</p>
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

    <!-- 文件列表 -->
    <div v-if="uploadedFiles.length > 0 || uploadMessage" class="file-list-container">
      <div class="file-list-header">
        <h3>已上传文件 ({{ uploadedFiles.length }})</h3>
        <div v-if="availableSizes.length > 0" class="controls-container">
          <!-- 基准比值按钮组 -->
          <div class="ratio-selector">
            <label class="ratio-label">基准比值:</label>
            <div class="ratio-buttons">
              <button 
                v-for="ratio in ratioOptions" 
                :key="ratio.value"
                :class="['ratio-btn', { 'active': selectedRatioType === ratio.value }]"
                @click="selectRatioType(ratio.value)"
              >
                {{ ratio.label }}
              </button>
            </div>
          </div>
          
          <!-- 基准码选择器 -->
          <div class="reference-selector">
            <label for="referenceSize">基准码:</label>
            <select 
              id="referenceSize" 
              v-model="selectedReferenceSize" 
              class="reference-select"
              @change="onReferenceSizeChange"
            >
              <option 
                v-for="size in availableSizes" 
                :key="size" 
                :value="size"
              >
                {{ size }}
              </option>
            </select>
          </div>
        </div>
      </div>
      <div v-if="uploadMessage" class="upload-message" :class="messageType">{{ uploadMessage }}</div>
      <div class="file-list">
        <div v-for="(file, index) in uploadedFiles" :key="index" class="file-item">
          <div class="file-info">
            <div class="file-name">{{ file.name }}</div>
            <div class="file-details">
              <span class="file-size">{{ formatFileSize(file.size) }}</span>
              <span class="file-type">{{ getFileExtension(file.name) }}</span>
            </div>
          </div>
          <button class="remove-btn" @click="removeFile(index)">×</button>
        </div>
      </div>
      <div class="actions">
        <button class="clear-btn" @click="clearAll">清空所有</button>
        <button class="process-btn" @click="processFiles" :disabled="uploadedFiles.length === 0 || !selectedReferenceSize">
          开始处理
        </button>
      </div>
    </div>

    <!-- 处理结果展示区域 -->
    <div v-if="processedJsonFiles.length > 0" class="results-container">
      <div class="results-header">
        <h3>处理结果</h3>
        <div class="results-summary">
          <span class="summary-item">
            <span class="summary-label">总文件数:</span>
            <span class="summary-value">{{ processedJsonFiles.length }}</span>
          </span>
          <span class="summary-item">
            <span class="summary-label">基准码:</span>
            <span class="summary-value">{{ selectedReferenceSize }}</span>
          </span>
          <span class="summary-item">
            <span class="summary-label">基准比值:</span>
            <span class="summary-value">{{ getRatioTypeLabel() }}</span>
          </span>
        </div>
      </div>

      <div class="results-grid">
        <div v-for="(jsonFile, index) in processedJsonFiles" :key="index" class="result-card">
          <div class="card-header">
            <div class="file-title">
              <h4>{{ jsonFile.fileName }}</h4>
              <span class="clothing-size" :class="{ 'is-reference': jsonFile.isReferenceSize }">
                {{ jsonFile.clothingSize }}
                <span v-if="jsonFile.isReferenceSize" class="reference-badge">基准</span>
              </span>
            </div>
            <div class="file-meta">
              <span class="file-size">{{ formatFileSize(jsonFile.fileSizeBytes) }}</span>
            </div>
          </div>
          
          <div class="card-content">
            <div class="zoom-info">
              <div class="zoom-stats">
                <div class="stat-item">
                  <span class="stat-label">裁片数量:</span>
                  <span class="stat-value">{{ getCutItemCount(jsonFile.jsonData) }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Zoom范围:</span>
                  <span class="stat-value">{{ getZoomRange(jsonFile.jsonData) }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">处理状态:</span>
                  <span class="stat-value success">已完成</span>
                </div>
              </div>
            </div>
            
            <div class="cut-items-preview">
              <h5>裁片信息预览:</h5>
              <div class="cut-items-list">
                <div 
                  v-for="(cutItem, cutIndex) in getPreviewCutItems(jsonFile.jsonData)" 
                  :key="cutIndex" 
                  class="cut-item-preview"
                >
                  <span class="cut-name">{{ cutItem.name }}</span>
                  <span class="cut-zoom">Zoom: {{ cutItem.zoom.toFixed(3) }}</span>
                </div>
                <div v-if="getCutItemCount(jsonFile.jsonData) > 5" class="more-items">
                  +{{ getCutItemCount(jsonFile.jsonData) - 5 }} 更多裁片...
                </div>
              </div>
            </div>
          </div>
          
          <div class="card-actions">
            <button class="download-btn primary" @click="downloadProcessedJson(jsonFile)">
              <span class="btn-icon">💾</span>
              下载处理后的JSON
            </button>
          </div>
        </div>
      </div>

      <div class="batch-actions">
        <button class="download-all-btn" @click="downloadAllProcessedJsons()">
          <span class="btn-icon">📦</span>
          批量下载所有文件
        </button>
      </div>
    </div>

    <!-- 加载提示 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">正在解析JSON文件...</div>
    </div>
  </div>
</template>

<script lang="js">
export default {
  name: 'ChangingParameters',
  data() {
    return {
      uploadedFiles: [],
      isDragOver: false,
      uploadMessage: '',
      messageType: 'info', // 可以是 'info', 'warning', 'error', 'success'
      processedJsonFiles: [], // 存储读取和解析后的JSON数据
      loading: false,
      availableSizes: [], // 可用的尺码选项
      selectedReferenceSize: '', // 选中的基准码
      ratioOptions: [ // 基准比值选项
        { label: '每项最大', value: 'itemMax' },
        { label: '每项最小', value: 'itemMin' },
        { label: '宽度', value: 'width' },
        { label: '高度', value: 'height' }
      ],
      selectedRatioType: 'itemMax' // 默认选中每项最大
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

    addFiles(files) {
      const validFiles = [];
      const invalidFiles = [];
      const duplicateFiles = [];
      
      files.forEach(file => {
        // 检查文件格式是否为JSON
        if (file.name.toLowerCase().endsWith('.json')) {
          // 检查是否已经存在相同的文件
          const exists = this.uploadedFiles.some(existingFile => 
            existingFile.name === file.name && existingFile.size === file.size
          );
          
          if (!exists) {
            this.uploadedFiles.push(file);
            validFiles.push(file);
          } else {
            duplicateFiles.push(file);
          }
        } else {
          invalidFiles.push(file);
        }
      });
      
      // 显示添加结果
      if (validFiles.length > 0) {
        console.log(`已添加 ${validFiles.length} 个JSON文件，总计 ${this.uploadedFiles.length} 个文件`);
        // 提取尺码选项
        this.extractSizeOptions();
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
        this.uploadMessage = `成功添加 ${validFiles.length} 个JSON文件`;
        this.messageType = 'success';
      }
      
      // 显示重复文件警告
      if (duplicateFiles.length > 0) {
        console.warn(`已忽略 ${duplicateFiles.length} 个重复文件`);
        if (validFiles.length === 0 && invalidFiles.length === 0) {
          this.uploadMessage = '所选文件已存在于列表中';
          this.messageType = 'warning';
        }
      }
    },

    removeFile(index) {
      this.uploadedFiles.splice(index, 1);
      if (this.uploadedFiles.length === 0) {
        this.uploadMessage = '';
        this.availableSizes = [];
        this.selectedReferenceSize = '';
      } else {
        // 重新提取尺码选项
        this.extractSizeOptions();
      }
    },

    clearAll() {
      this.uploadedFiles = [];
      this.uploadMessage = '';
      this.processedJsonFiles = [];
      this.availableSizes = [];
      this.selectedReferenceSize = '';
    },

    async processFiles() {
      if (this.uploadedFiles.length === 0) {
        this.uploadMessage = '请先上传JSON文件';
        this.messageType = 'warning';
        return;
      }

      if (!this.selectedReferenceSize) {
        this.uploadMessage = '请先选择基准码';
        this.messageType = 'warning';
        return;
      }

      this.loading = true;
      this.processedJsonFiles = [];
      
      const processedFiles = [];
      const failedFiles = [];
      
      console.log('开始处理文件，基准码:', this.selectedReferenceSize, '基准比值:', this.selectedRatioType);
      
      // 第一步：读取所有文件并解析JSON
      const allJsonFiles = [];
      for (const file of this.uploadedFiles) {
        try {
          // 读取文件内容
          const content = await this.readFileAsText(file);
          
          // 解析JSON
          const jsonData = JSON.parse(content);

          console.log(`解析文件: ${file.name}`, jsonData);

          // 添加到临时数组
          allJsonFiles.push({
            fileName: file.name,
            fileSizeBytes: file.size,
            originalFile: file,
            jsonData: jsonData,
            hasZoomParam: this.checkForZoomParameter(jsonData),
            clothingSize: jsonData.file_info?.size || '未知',
            isReferenceSize: jsonData.file_info?.size === this.selectedReferenceSize
          });
          
          console.log(`成功解析文件: ${file.name}，尺码: ${jsonData.file_info?.size || '未知'}`);
        } catch (error) {
          console.error(`解析文件 ${file.name} 失败:`, error);
          failedFiles.push({
            fileName: file.name,
            error: error.message || '未知错误'
          });
        }
      }
      
      // 第二步：找到基准码的JSON文件
      const referenceJsonFile = allJsonFiles.find(file => file.isReferenceSize);
      
      if (!referenceJsonFile) {
        this.uploadMessage = `未找到尺码为 ${this.selectedReferenceSize} 的基准文件`;
        this.messageType = 'error';
        this.loading = false;
        return;
      }
      
      console.log('找到基准文件:', referenceJsonFile.fileName);
      
      // 第三步：处理基准JSON - 将cut数组下所有子元素的zoom设为1
      if (referenceJsonFile.jsonData.cut && Array.isArray(referenceJsonFile.jsonData.cut)) {
        referenceJsonFile.jsonData.cut.forEach(cutItem => {
          if (cutItem && typeof cutItem === 'object') {
            cutItem.zoom = 1;
          }
        });
        console.log('基准文件zoom参数已全部设为1:', referenceJsonFile.jsonData.cut);
      }
      
      // 将处理后的基准JSON保存
      const baselineJson = referenceJsonFile.jsonData;
      
      // 第四步：处理其他JSON文件 - 根据基准JSON的cut数组name匹配处理zoom
      for (const jsonFile of allJsonFiles) {
        try {
          if (jsonFile.isReferenceSize) {
            // 基准文件已经处理过，直接添加到结果
            processedFiles.push(jsonFile);
            this.processedJsonFiles.push(jsonFile);
            console.log(`基准文件处理完成: ${jsonFile.fileName}`);
          } else {
            // 其他文件需要根据基准文件处理
            console.log(`开始处理非基准文件: ${jsonFile.fileName}`);
            
            if (jsonFile.jsonData.cut && Array.isArray(jsonFile.jsonData.cut) && 
                baselineJson.cut && Array.isArray(baselineJson.cut)) {
              
              // 根据name匹配处理zoom - 这里预留给你手动实现
              // TODO: 这里将来由你实现具体的zoom处理逻辑
              this.processZoomByNameMatching(jsonFile.jsonData, baselineJson);
              
              console.log(`文件 ${jsonFile.fileName} zoom处理完成`);
            }
            
            processedFiles.push(jsonFile);
            this.processedJsonFiles.push(jsonFile);
          }
        } catch (error) {
          console.error(`处理文件 ${jsonFile.fileName} 的zoom时出错:`, error);
          failedFiles.push({
            fileName: jsonFile.fileName,
            error: error.message || '处理zoom时出错'
          });
        }
      }
      
      // 显示处理结果
      if (processedFiles.length > 0 && failedFiles.length === 0) {
        this.uploadMessage = `成功解析了 ${processedFiles.length} 个JSON文件`;
        this.messageType = 'success';
      } else if (processedFiles.length > 0 && failedFiles.length > 0) {
        this.uploadMessage = `成功解析了 ${processedFiles.length} 个文件，${failedFiles.length} 个文件解析失败`;
        this.messageType = 'warning';
      } else if (processedFiles.length === 0 && failedFiles.length > 0) {
        this.uploadMessage = `所有文件解析失败，请检查JSON格式是否正确`;
        this.messageType = 'error';
      }
      
      if (failedFiles.length > 0) {
        console.warn('解析失败的文件:', failedFiles);
      }
      
      this.loading = false;
    },

    // 读取文件内容为文本（UTF-8编码）
    readFileAsText(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8');
      });
    },

    // 检查JSON数据中是否包含zoom参数
    checkForZoomParameter(jsonData) {
      const jsonStr = JSON.stringify(jsonData).toLowerCase();
      return jsonStr.includes('zoom');
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

    // 下载处理后的JSON文件
    downloadProcessedJson(jsonFile) {
      const jsonStr = JSON.stringify(jsonFile.jsonData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      // 添加处理后的标识
      const fileName = jsonFile.fileName.replace('.json', '-processed.json');
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      }, 100);
    },

    // 批量下载所有处理后的JSON文件
    downloadAllProcessedJsons() {
      this.processedJsonFiles.forEach((jsonFile, index) => {
        setTimeout(() => {
          this.downloadProcessedJson(jsonFile);
        }, index * 500); // 每个文件间隔500ms下载
      });
      
      this.uploadMessage = `正在批量下载 ${this.processedJsonFiles.length} 个处理后的文件`;
      this.messageType = 'success';
    },

    // 从上传的文件中提取尺码选项
    async extractSizeOptions() {
      const sizes = new Set();
      
      for (const file of this.uploadedFiles) {
        try {
          const content = await this.readFileAsText(file);
          const jsonData = JSON.parse(content);
          
          // 提取 file_info.size
          if (jsonData.file_info && jsonData.file_info.size) {
            sizes.add(jsonData.file_info.size);
          }
        } catch (error) {
          console.warn(`无法从文件 ${file.name} 中提取尺码:`, error);
        }
      }
      
      // 更新可用尺码
      this.availableSizes = Array.from(sizes).sort();
      
      // 如果之前选择的基准码不在新的选项中，或者没有选择，则按优先级选择
      if (!this.selectedReferenceSize || !this.availableSizes.includes(this.selectedReferenceSize)) {
        if (this.availableSizes.length > 0) {
          // 首先查找 5XL（不区分大小写）
          const fiveXL = this.availableSizes.find(size => 
            size && size.toString().toLowerCase() === '5xl'
          );
          
          // 如果找到 5XL 就选择它，否则选择第一个
          this.selectedReferenceSize = fiveXL || this.availableSizes[0];
        } else {
          this.selectedReferenceSize = '';
        }
      }
      
      console.log('提取到的尺码选项:', this.availableSizes);
      console.log('选中的基准码:', this.selectedReferenceSize);
    },

    // 基准码选择改变时的处理
    onReferenceSizeChange() {
      console.log('基准码已更改为:', this.selectedReferenceSize);
    },

    // 选择基准比值类型
    selectRatioType(ratioType) {
      this.selectedRatioType = ratioType;
      console.log('基准比值类型已更改为:', ratioType);
    },

    // 根据name匹配处理zoom参数 - 预留给你手动实现
    processZoomByNameMatching(targetJson, baselineJson) {
      console.log('目标JSON:', targetJson);
      console.log('基准JSON:', baselineJson);
      console.log('当前选择的基准比值:', this.selectedRatioType);

      const targetCut = targetJson.cut;
      const baselineCut = baselineJson.cut;

      // 先把 baseline 分组
      const baselineGroup = baselineCut.reduce((map, item) => {
        if (!map[item.name]) map[item.name] = [];
        map[item.name].push(item);
        return map;
      }, {});

      for (const targetItem of targetCut) {
        const group = baselineGroup[targetItem.name];
        if (!group || group.length === 0) {
          console.warn(`未找到对应项: ${targetItem.name}`);
          continue;
        }

        // 按顺序取出一个 baselineItem
        const baselineItem = group.shift();

        switch (this.selectedRatioType) {
          case 'itemMax':
            targetItem.zoom = Math.max(
              targetItem.size.width / baselineItem.size.width,
              targetItem.size.height / baselineItem.size.height
            );
            break;
          case 'itemMin':
            targetItem.zoom = Math.min(
              targetItem.size.width / baselineItem.size.width,
              targetItem.size.height / baselineItem.size.height
            );
            break;
          case 'width':
            targetItem.zoom = targetItem.size.width / baselineItem.size.width;
            break;
          case 'height':
            targetItem.zoom = targetItem.size.height / baselineItem.size.height;
            break;
        }
      }

      console.log('zoom处理完成:', targetCut);
    },

    // 获取基准比值类型的标签
    getRatioTypeLabel() {
      const ratioOption = this.ratioOptions.find(option => option.value === this.selectedRatioType);
      return ratioOption ? ratioOption.label : this.selectedRatioType;
    },

    // 获取裁片数量
    getCutItemCount(jsonData) {
      return jsonData.cut && Array.isArray(jsonData.cut) ? jsonData.cut.length : 0;
    },

    // 获取Zoom范围
    getZoomRange(jsonData) {
      if (!jsonData.cut || !Array.isArray(jsonData.cut) || jsonData.cut.length === 0) {
        return 'N/A';
      }
      
      const zooms = jsonData.cut.map(item => item.zoom || 1);
      const minZoom = Math.min(...zooms);
      const maxZoom = Math.max(...zooms);
      
      if (minZoom === maxZoom) {
        return minZoom.toFixed(3);
      }
      
      return `${minZoom.toFixed(3)} - ${maxZoom.toFixed(3)}`;
    },

    // 获取前5个裁片用于预览
    getPreviewCutItems(jsonData) {
      if (!jsonData.cut || !Array.isArray(jsonData.cut)) {
        return [];
      }
      
      return jsonData.cut.slice(0, 5).map(item => ({
        name: item.name || '未命名',
        zoom: item.zoom || 1
      }));
    }
  }
}
</script>

<style scoped>
.changing-parameters {
  max-width: 800px;
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

.file-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.file-list-header h3 {
  margin: 0;
}

.controls-container {
  display: flex;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
}

.ratio-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ratio-label {
  font-size: 14px;
  font-weight: bold;
  color: #333;
  white-space: nowrap;
}

.ratio-buttons {
  display: flex;
  gap: 4px;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 2px;
  background-color: #f9f9f9;
}

.ratio-btn {
  padding: 6px 12px;
  border: none;
  background-color: transparent;
  color: #666;
  font-size: 12px;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.ratio-btn:hover {
  background-color: #e8f4f8;
  color: #333;
}

.ratio-btn.active {
  background-color: #4CAF50;
  color: white;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.ratio-btn.active:hover {
  background-color: #45a049;
}

.reference-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.reference-selector label {
  font-size: 14px;
  font-weight: bold;
  color: #333;
  white-space: nowrap;
}

.reference-select {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  min-width: 120px;
}

.reference-select:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
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
  transition: background-color 0.3s;
}

.clear-btn {
  background-color: #ff9800;
  color: white;
}

.clear-btn:hover {
  background-color: #e68a00;
}

.process-btn {
  background-color: #4CAF50;
  color: white;
}

.process-btn:hover {
  background-color: #45a049;
}

.process-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.process-btn:disabled:hover {
  background-color: #cccccc;
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

/* 处理结果展示区域样式 */
.results-container {
  margin-top: 30px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.1);
}

.results-header {
  margin-bottom: 25px;
  text-align: center;
}

.results-header h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 24px;
  font-weight: 600;
}

.results-summary {
  display: flex;
  justify-content: center;
  gap: 30px;
  flex-wrap: wrap;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.summary-label {
  font-size: 12px;
  color: #7f8c8d;
  font-weight: 500;
}

.summary-value {
  font-size: 16px;
  color: #2c3e50;
  font-weight: bold;
  padding: 4px 12px;
  background-color: rgba(255,255,255,0.8);
  border-radius: 20px;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 25px;
}

.result-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  transition: all 0.3s ease;
  border: 1px solid rgba(0,0,0,0.05);
}

.result-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0,0,0,0.12);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 2px solid #f8f9fa;
}

.file-title h4 {
  margin: 0 0 8px 0;
  color: #2c3e50;
  font-size: 16px;
  font-weight: 600;
}

.clothing-size {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
  background-color: #ecf0f1;
  color: #7f8c8d;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.clothing-size.is-reference {
  background: linear-gradient(135deg, #4caf50, #45a049);
  color: white;
}

.reference-badge {
  background-color: rgba(255,255,255,0.3);
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 10px;
}

.file-meta {
  text-align: right;
}

.file-size {
  font-size: 12px;
  color: #95a5a6;
}

.card-content {
  margin-bottom: 20px;
}

.zoom-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 12px;
  margin-bottom: 15px;
}

.stat-item {
  text-align: center;
  padding: 8px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.stat-label {
  display: block;
  font-size: 11px;
  color: #7f8c8d;
  margin-bottom: 4px;
}

.stat-value {
  display: block;
  font-size: 14px;
  font-weight: bold;
  color: #2c3e50;
}

.stat-value.success {
  color: #27ae60;
}

.cut-items-preview h5 {
  margin: 0 0 10px 0;
  color: #34495e;
  font-size: 14px;
  font-weight: 600;
}

.cut-items-list {
  max-height: 150px;
  overflow-y: auto;
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 10px;
}

.cut-item-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #ecf0f1;
}

.cut-item-preview:last-child {
  border-bottom: none;
}

.cut-name {
  font-size: 12px;
  color: #2c3e50;
  font-weight: 500;
}

.cut-zoom {
  font-size: 11px;
  color: #7f8c8d;
  font-family: 'Courier New', monospace;
  background-color: white;
  padding: 2px 6px;
  border-radius: 4px;
}

.more-items {
  text-align: center;
  font-size: 11px;
  color: #7f8c8d;
  font-style: italic;
  padding: 8px 0;
}

.card-actions {
  display: flex;
  justify-content: center;
}

.download-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 25px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.3s ease;
  text-decoration: none;
}

.download-btn.primary {
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
  box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
}

.download-btn.primary:hover {
  background: linear-gradient(135deg, #2980b9, #2471a3);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
}

.btn-icon {
  font-size: 14px;
}

.batch-actions {
  text-align: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px solid rgba(255,255,255,0.8);
}

.download-all-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 30px;
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: white;
  border: none;
  border-radius: 30px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
}

.download-all-btn:hover {
  background: linear-gradient(135deg, #c0392b, #a93226);
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(231, 76, 60, 0.4);
}

/* 加载提示样式 */
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

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .changing-parameters {
    padding: 10px;
  }
  
  .upload-area {
    min-height: 150px;
    padding: 20px;
  }
  
  .upload-icon {
    font-size: 36px;
  }
  
  .primary-text {
    font-size: 16px;
  }
  
  .secondary-text {
    font-size: 14px;
  }
  
  .actions {
    flex-direction: column;
    gap: 10px;
  }
  
  .clear-btn, .process-btn {
    width: 100%;
  }
  
  .json-file-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .json-file-info {
    width: 100%;
    justify-content: space-between;
  }
  
  .json-display {
    font-size: 11px;
    max-height: 200px;
  }
  
  .file-list-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .controls-container {
    width: 100%;
    flex-direction: column;
    gap: 15px;
  }
  
  .ratio-selector {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .ratio-buttons {
    width: 100%;
    justify-content: space-between;
  }
  
  .ratio-btn {
    flex: 1;
    text-align: center;
    padding: 8px 4px;
    font-size: 11px;
  }
  
  .reference-selector {
    width: 100%;
    justify-content: space-between;
  }
  
  .reference-select {
    min-width: auto;
    flex: 1;
    max-width: 150px;
  }
  
  .results-container {
    margin-top: 20px;
    padding: 15px;
  }
  
  .results-summary {
    gap: 15px;
  }
  
  .summary-item {
    min-width: 80px;
  }
  
  .results-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .result-card {
    padding: 15px;
  }
  
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .zoom-stats {
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  
  .stat-item {
    padding: 6px;
  }
  
  .download-btn {
    padding: 8px 16px;
    font-size: 12px;
  }
  
  .download-all-btn {
    padding: 10px 20px;
    font-size: 13px;
  }
}
</style>
