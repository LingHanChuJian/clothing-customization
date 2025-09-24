<template>
  <div class="dxf-parameters">
    <h2>DXF参数设置</h2>

    <!-- 主料文件上传区域 -->
    <div class="upload-section">
      <h3>主料文件上传</h3>
      <div 
        class="upload-area"
        :class="{ 'dragover': isDragOverMain }"
        @click="triggerFileInput('main')"
        @drop="handleDrop($event, 'main')"
        @dragover="handleDragOver($event, 'main')"
        @dragenter="handleDragEnter($event, 'main')"
        @dragleave="handleDragLeave($event, 'main')"
      >
        <div class="upload-icon">📁</div>
        <div class="upload-text">
          <p class="primary-text">点击此区域选择主料文件</p>
          <p class="secondary-text">或拖拽文件/文件夹到此处</p>
          <p class="hint-text">支持多DXF文件批量上传</p>
        </div>
        <input 
          type="file" 
          ref="mainFileInput" 
          multiple 
          accept=".dxf"
          @change="handleFileUpload($event, 'main')" 
          style="display: none;" 
        />
      </div>

      <!-- 主料文件列表 -->
      <div v-if="mainFiles.length > 0" class="file-list-container">
        <h4>主料文件 ({{ mainFiles.length }})</h4>
        <div class="file-list">
          <div v-for="(file, index) in mainFiles" :key="index" class="file-item">
            <div class="file-info">
              <div class="file-name">{{ file.name }}</div>
              <div class="file-details">
                <span class="file-size">{{ formatFileSize(file.size) }}</span>
                <span class="file-type">{{ getFileExtension(file.name) }}</span>
              </div>
            </div>
            <button class="remove-btn" @click="removeFile('main', index)">×</button>
          </div>
        </div>
        <div class="actions">
          <button class="clear-btn" @click="clearFiles('main')">清空主料文件</button>
        </div>
      </div>
    </div>

    <!-- 辅料文件上传区域 -->
    <div class="upload-section">
      <h3>辅料文件上传</h3>
      <div 
        class="upload-area"
        :class="{ 'dragover': isDragOverAux }"
        @click="triggerFileInput('aux')"
        @drop="handleDrop($event, 'aux')"
        @dragover="handleDragOver($event, 'aux')"
        @dragenter="handleDragEnter($event, 'aux')"
        @dragleave="handleDragLeave($event, 'aux')"
      >
        <div class="upload-icon">📁</div>
        <div class="upload-text">
          <p class="primary-text">点击此区域选择辅料文件</p>
          <p class="secondary-text">或拖拽文件/文件夹到此处</p>
          <p class="hint-text">支持多DXF文件批量上传</p>
        </div>
        <input 
          type="file" 
          ref="auxFileInput" 
          multiple 
          accept=".dxf"
          @change="handleFileUpload($event, 'aux')" 
          style="display: none;" 
        />
      </div>

      <!-- 辅料文件列表 -->
      <div v-if="auxFiles.length > 0" class="file-list-container">
        <h4>辅料文件 ({{ auxFiles.length }})</h4>
        <div class="file-list">
          <div v-for="(file, index) in auxFiles" :key="index" class="file-item">
            <div class="file-info">
              <div class="file-name">{{ file.name }}</div>
              <div class="file-details">
                <span class="file-size">{{ formatFileSize(file.size) }}</span>
                <span class="file-type">{{ getFileExtension(file.name) }}</span>
              </div>
            </div>
            <button class="remove-btn" @click="removeFile('aux', index)">×</button>
          </div>
        </div>
        <div class="actions">
          <button class="clear-btn" @click="clearFiles('aux')">清空辅料文件</button>
        </div>
      </div>
    </div>

    <!-- 消息提示 -->
    <div v-if="uploadMessage" class="upload-message" :class="messageType">{{ uploadMessage }}</div>

    <!-- 全局操作按钮 -->
    <div v-if="mainFiles.length > 0 || auxFiles.length > 0" class="global-actions">
      <button class="clear-all-btn" @click="clearAllFiles">清空所有文件</button>
      <button class="process-btn" @click="processFiles">处理文件</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DXFParameters',
  data() {
    return {
      mainFiles: [], // 主料文件列表
      auxFiles: [], // 辅料文件列表
      isDragOverMain: false, // 主料区域拖拽状态
      isDragOverAux: false, // 辅料区域拖拽状态
      uploadMessage: '', // 上传消息
      messageType: 'info' // 消息类型: 'info', 'warning', 'error', 'success'
    }
  },
  methods: {
    // 触发文件选择
    triggerFileInput(type) {
      if (type === 'main') {
        this.$refs.mainFileInput.click();
      } else if (type === 'aux') {
        this.$refs.auxFileInput.click();
      }
    },

    // 处理文件上传
    handleFileUpload(event, type) {
      const files = Array.from(event.target.files);
      this.addFiles(files, type);
      // 清空input值，允许重复选择相同文件
      event.target.value = '';
    },

    // 处理拖拽放置
    handleDrop(event, type) {
      event.preventDefault();
      this.setDragState(type, false);
      
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
          this.addFiles(allFiles, type);
        });
      } else {
        // 兜底：如果 items 不可用，使用 files（仅支持直接文件拖拽）
        const droppedFiles = Array.from(event.dataTransfer.files);
        if (droppedFiles.length > 0) {
          this.addFiles(droppedFiles, type);
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

    // 处理拖拽悬停
    handleDragOver(event, type) {
      event.preventDefault();
      this.setDragState(type, true);
    },

    // 处理拖拽进入
    handleDragEnter(event, type) {
      event.preventDefault();
      this.setDragState(type, true);
    },

    // 处理拖拽离开
    handleDragLeave(event, type) {
      event.preventDefault();
      // 只有当拖拽完全离开区域时才取消高亮
      if (!event.currentTarget.contains(event.relatedTarget)) {
        this.setDragState(type, false);
      }
    },

    // 设置拖拽状态
    setDragState(type, state) {
      if (type === 'main') {
        this.isDragOverMain = state;
      } else if (type === 'aux') {
        this.isDragOverAux = state;
      }
    },

    // 添加文件
    addFiles(files, type) {
      const validFiles = [];
      const invalidFiles = [];
      const targetArray = type === 'main' ? this.mainFiles : this.auxFiles;
      
      files.forEach(file => {
        // 检查文件格式是否为DXF
        if (file.name.toLowerCase().endsWith('.dxf')) {
          // 检查是否已经存在相同的文件
          const exists = targetArray.some(existingFile => 
            existingFile.name === file.name && existingFile.size === file.size
          );
          
          if (!exists) {
            targetArray.push(file);
            validFiles.push(file);
          }
        } else {
          invalidFiles.push(file);
        }
      });
      
      // 显示添加结果
      const fileTypeName = type === 'main' ? '主料' : '辅料';
      
      if (validFiles.length > 0) {
        console.log(`已添加 ${validFiles.length} 个${fileTypeName}DXF文件，总计 ${targetArray.length} 个文件`);
      }
      
      // 显示无效文件警告
      if (invalidFiles.length > 0) {
        console.warn(`已忽略 ${invalidFiles.length} 个非DXF文件`);
        if (invalidFiles.length === files.length) {
          // 如果所有文件都是无效的，显示提示
          this.uploadMessage = '只支持上传DXF格式的文件，请重新选择';
          this.messageType = 'error';
        } else if (validFiles.length > 0) {
          // 如果有部分有效文件，显示部分成功的提示
          this.uploadMessage = `已添加 ${validFiles.length} 个${fileTypeName}DXF文件，已忽略 ${invalidFiles.length} 个非DXF文件`;
          this.messageType = 'warning';
        }
      } else if (validFiles.length > 0) {
        // 如果全部是有效文件，显示成功提示
        this.uploadMessage = `成功添加 ${validFiles.length} 个${fileTypeName}DXF文件`;
        this.messageType = 'success';
      }
    },

    // 移除文件
    removeFile(type, index) {
      if (type === 'main') {
        this.mainFiles.splice(index, 1);
      } else if (type === 'aux') {
        this.auxFiles.splice(index, 1);
      }
    },

    // 清空指定类型的文件
    clearFiles(type) {
      if (type === 'main') {
        this.mainFiles = [];
      } else if (type === 'aux') {
        this.auxFiles = [];
      }
      this.uploadMessage = '';
    },

    // 清空所有文件
    clearAllFiles() {
      this.mainFiles = [];
      this.auxFiles = [];
      this.uploadMessage = '';
    },

    // 处理文件（暂时只是获取文件数据）
    processFiles() {
      if (this.mainFiles.length === 0 && this.auxFiles.length === 0) {
        this.uploadMessage = '请先上传文件';
        this.messageType = 'warning';
        return;
      }

      console.log('主料文件:', this.mainFiles);
      console.log('辅料文件:', this.auxFiles);
      
      this.uploadMessage = `获取到 ${this.mainFiles.length} 个主料文件和 ${this.auxFiles.length} 个辅料文件的数据`;
      this.messageType = 'success';
    },

    // 格式化文件大小
    formatFileSize(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // 获取文件扩展名
    getFileExtension(filename) {
      return filename.split('.').pop().toUpperCase();
    }
  }
}
</script>

<style scoped>
.dxf-parameters {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.dxf-parameters h2 {
  color: #333;
  margin-bottom: 30px;
  text-align: center;
  font-size: 28px;
  font-weight: 600;
}

.upload-section {
  margin-bottom: 40px;
  border: 1px solid #e1e5e9;
  border-radius: 12px;
  padding: 20px;
  background: #fafbfc;
}

.upload-section h3 {
  color: #444;
  margin-bottom: 20px;
  font-size: 20px;
  font-weight: 500;
  border-bottom: 2px solid #007bff;
  padding-bottom: 8px;
}

.upload-area {
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
  margin-bottom: 20px;
}

.upload-area:hover {
  border-color: #007bff;
  background-color: #f8f9ff;
}

.upload-area.dragover {
  border-color: #007bff;
  background-color: #e3f2fd;
  transform: scale(1.02);
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.7;
}

.upload-text .primary-text {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px 0;
}

.upload-text .secondary-text {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 4px 0;
}

.upload-text .hint-text {
  font-size: 12px;
  color: #9ca3af;
  margin: 0;
}

.file-list-container {
  margin-top: 20px;
}

.file-list-container h4 {
  color: #374151;
  margin-bottom: 12px;
  font-size: 16px;
  font-weight: 600;
}

.file-list {
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  transition: background-color 0.2s;
}

.file-item:last-child {
  border-bottom: none;
}

.file-item:hover {
  background-color: #f9fafb;
}

.file-info {
  flex: 1;
}

.file-name {
  font-weight: 500;
  color: #374151;
  margin-bottom: 4px;
}

.file-details {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #6b7280;
}

.file-size, .file-type {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
}

.remove-btn {
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  transition: background-color 0.2s;
}

.remove-btn:hover {
  background: #dc2626;
}

.actions {
  margin-top: 12px;
  display: flex;
  gap: 12px;
}

.clear-btn {
  background: #6b7280;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.clear-btn:hover {
  background: #4b5563;
}

.upload-message {
  padding: 12px 16px;
  border-radius: 8px;
  margin: 20px 0;
  font-size: 14px;
  font-weight: 500;
}

.upload-message.info {
  background: #dbeafe;
  color: #1e40af;
  border: 1px solid #93c5fd;
}

.upload-message.success {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #86efac;
}

.upload-message.warning {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fcd34d;
}

.upload-message.error {
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fca5a5;
}

.global-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.clear-all-btn {
  background: #6b7280;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.clear-all-btn:hover {
  background: #4b5563;
}

.process-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.process-btn:hover {
  background: #0056b3;
}
</style>
