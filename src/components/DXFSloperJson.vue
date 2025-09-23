<template>
  <div class="batch-uploader">
    <h2>DXF转Sloper JSON</h2>

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
        <p class="hint-text">支持多DXF文件批量上传</p>
      </div>
      <input 
        type="file" 
        ref="fileInput" 
        multiple 
        accept=".dxf"
        @change="handleFileUpload" 
        style="display: none;" 
      />
    </div>

    <!-- 文件列表 -->
    <div v-if="uploadedFiles.length > 0 || uploadMessage" class="file-list-container">
      <h3>已上传文件 ({{ uploadedFiles.length }})</h3>
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
        <button class="process-btn" @click="generateSloperJson">生成Sloper JSON</button>
      </div>
    </div>


    <!-- 图片展示区域 -->
    <div v-if="processedResults.length > 0" class="results-container">
      <div class="results-header">
        <h3>处理结果 ({{ processedResults.length }} 个文件)</h3>
        <button class="download-all-btn" @click="downloadAllZipPackages">
          下载全部ZIP包
        </button>
      </div>
      <div v-for="(result, index) in processedResults" :key="index" class="result-item">
        <div class="result-header">
          <h4>{{ result.fileName }}</h4>
          <div class="result-actions">
            <button class="download-btn download-zip-btn" @click="downloadZipPackage(result)">
              下载压缩包
            </button>
            <button class="download-btn" @click="downloadAllImages(result)">
              下载所有图片
            </button>
            <button class="download-btn" @click="downloadSloperJson(result)">
              下载Sloper JSON
            </button>
          </div>
        </div>
        
        <!-- 整体图片 -->
        <div class="overall-image-section">
          <h5>整体图片</h5>
          <div class="image-container">
            <img 
              :src="result.overallImage.imageUrl" 
              :alt="`${result.fileName} - 整体图片`"
              class="overall-image"
              @click="previewImage(result.overallImage.imageUrl, `${result.fileName} - 整体图片`)"
            />
            <div class="image-info">
              <span>尺寸: {{ Math.round(result.overallImage.size.width) }} × {{ Math.round(result.overallImage.size.height) }} px</span>
              <button class="download-single-btn" @click="downloadSingleImage(result.overallImage.imageUrl, `${result.fileName}-整体图片.png`)">
                下载
              </button>
            </div>
          </div>
        </div>

        <!-- 子图片网格 -->
        <div v-if="result.childImages.length > 0" class="children-images-section">
          <h5>子图片 ({{ result.childImages.length }} 个)</h5>
          <div class="images-grid">
            <div 
              v-for="(childImage, childIndex) in result.childImages" 
              :key="childIndex" 
              class="child-image-item"
            >
              <div class="image-container">
                <img 
                  :src="childImage.imageUrl" 
                  :alt="`${result.fileName} - 子图片 ${childIndex + 1}`"
                  class="child-image"
                  @click="previewImage(childImage.imageUrl, `${result.fileName} - 子图片 ${childIndex + 1}`)"
                />
                <div class="image-info">
                  <span class="image-type">{{ childImage.type }}</span>
                  <span class="image-size">{{ Math.round(childImage.size.width) }} × {{ Math.round(childImage.size.height) }}</span>
                  <button class="download-single-btn" @click="downloadSingleImage(childImage.imageUrl, `${result.fileName}-子图片-${childIndex + 1}.png`)">
                    下载
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 图片预览模态框 -->
    <div v-if="previewModal.show" class="preview-modal" @click="closePreview">
      <div class="preview-content" @click.stop>
        <div class="preview-header">
          <h4>{{ previewModal.title }}</h4>
          <button class="close-btn" @click="closePreview">×</button>
        </div>
        <div class="preview-image-container">
          <img :src="previewModal.imageUrl" :alt="previewModal.title" class="preview-image" />
        </div>
        <div class="preview-actions">
          <button class="download-btn" @click="downloadSingleImage(previewModal.imageUrl, `${previewModal.title}.png`)">
            下载图片
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">处理中...</div>
    </div>
  </div>
</template>

<script>
import { DXFAnalysis } from '@/utils/DXFAnalysis';
import { generateSloper } from '@/utils/generateSloper';
import { generateCanvasSloper } from '@/utils/generateCanvasSloper';
import { generateAllCanvasSloper } from '@/utils/generateAllCanvasSloper';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default {
  name: 'DXFSloperJson',
  data() {
    return {
      uploadedFiles: [],
      loading: false,
      isDragOver: false,
      uploadMessage: '',
      messageType: 'info', // 可以是 'info', 'warning', 'error', 'success'
      processedResults: [], // 存储处理后的结果
      previewModal: {
        show: false,
        imageUrl: '',
        title: ''
      }
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
      
      files.forEach(file => {
        // 检查文件格式是否为DXF
        if (file.name.toLowerCase().endsWith('.dxf')) {
          // 检查是否已经存在相同的文件
          const exists = this.uploadedFiles.some(existingFile => 
            existingFile.name === file.name && existingFile.size === file.size
          );
          
          if (!exists) {
            this.uploadedFiles.push(file);
            validFiles.push(file);
          }
        } else {
          invalidFiles.push(file);
        }
      });
      
      // 显示添加结果
      if (validFiles.length > 0) {
        console.log(`已添加 ${validFiles.length} 个DXF文件，总计 ${this.uploadedFiles.length} 个文件`);
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
          this.uploadMessage = `已添加 ${validFiles.length} 个DXF文件，已忽略 ${invalidFiles.length} 个非DXF文件`;
          this.messageType = 'warning';
        }
      } else if (validFiles.length > 0) {
        // 如果全部是有效文件，显示成功提示
        this.uploadMessage = `成功添加 ${validFiles.length} 个DXF文件`;
        this.messageType = 'success';
      }
    },

    removeFile(index) {
      this.uploadedFiles.splice(index, 1);
    },

    clearAll() {
      this.uploadedFiles = [];
      this.uploadMessage = '';
      this.processedResults = [];
    },

    async generateSloperJson() {
      if (this.uploadedFiles.length === 0) {
        this.uploadMessage = '请先上传DXF文件';
        this.messageType = 'warning';
        return;
      }

      this.loading = true;
      
      // 清空之前的处理结果
      this.processedResults = [];
      
      // 处理文件数据
      const processedFiles = [];
      const failedFiles = [];
      
      for (const file of this.uploadedFiles) {
        try {
          // 处理DXF文件
          const dxf = await DXFAnalysis(file);
          console.log(dxf)
          const entityImages = generateCanvasSloper(dxf);
          const entityImage = generateAllCanvasSloper(dxf);
          const sloperJson = generateSloper(file.name, { overall: entityImage, children: entityImages });

          // 添加到成功处理的文件列表
          const processedResult = {
            fileName: file.name,
            overallImage: entityImage,
            childImages: entityImages,
            sloperJson: sloperJson
          };
          
          processedFiles.push(processedResult);
          this.processedResults.push(processedResult);
          
          console.log(`成功处理文件: ${file.name}`);
        } catch (error) {
          // 记录失败的文件
          console.error(`处理文件 ${file.name} 时出错:`, error);
          failedFiles.push({
            fileName: file.name,
            error: error.message || '未知错误'
          });
          
          // 继续处理下一个文件，不中断循环
          continue;
        }
      }
      
      // 处理完成后显示结果
      if (processedFiles.length > 0 && failedFiles.length === 0) {
        // 全部成功
        this.uploadMessage = `成功处理了 ${processedFiles.length} 个DXF文件`;
        this.messageType = 'success';
      } else if (processedFiles.length > 0 && failedFiles.length > 0) {
        // 部分成功
        this.uploadMessage = `成功处理了 ${processedFiles.length} 个文件，${failedFiles.length} 个文件处理失败`;
        this.messageType = 'warning';
      } else if (processedFiles.length === 0 && failedFiles.length > 0) {
        // 全部失败
        this.uploadMessage = `所有文件处理失败，请检查文件格式是否正确`;
        this.messageType = 'error';
      }
      
      // 在控制台输出详细的失败信息
      if (failedFiles.length > 0) {
        console.warn('处理失败的文件:', failedFiles);
      }
      
      // 完成处理
      this.loading = false;
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

    // 图片预览
    previewImage(imageUrl, title) {
      this.previewModal = {
        show: true,
        imageUrl: imageUrl,
        title: title
      };
    },

    closePreview() {
      this.previewModal.show = false;
    },

    // 下载单个图片
    downloadSingleImage(imageUrl, filename) {
      const a = document.createElement('a');
      a.href = imageUrl;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
      }, 100);
    },

    // 下载所有图片（逐个下载）
    downloadAllImages(result) {
      const folderName = result.fileName.replace('.dxf', '');
      
      try {
        // 下载整体图片
        this.downloadSingleImage(result.overallImage.imageUrl, `${folderName}-整体图片.png`);
        
        // 延迟下载子图片，避免浏览器阻止多个下载
        result.childImages.forEach((childImage, index) => {
          setTimeout(() => {
            const firstChild = result.childImages[0]
            const textName = firstChild.textsList.find(item => item.label === 'Piece Name')
            const curName = textName ? textName.value : ''
            const matchName = curName.match(/boke_(.*)/)
            const name = matchName ? matchName[1] : '未知裁片'

            this.downloadSingleImage(
              childImage.imageUrl, 
              `${name}.png`
            );
          }, (index + 1) * 500); // 每张图片间隔500ms
        });
        
        this.uploadMessage = `正在下载 ${folderName} 的所有图片 (${result.childImages.length + 1} 张)`;
        this.messageType = 'success';
      } catch (error) {
        console.error('下载图片失败:', error);
        this.uploadMessage = '下载图片失败，请重试';
        this.messageType = 'error';
      }
    },

    // 下载Sloper JSON文件
    downloadSloperJson(result) {
      const jsonStr = JSON.stringify(result.sloperJson, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      // a.download = result.fileName.replace('.dxf', '-sloper.json');
      a.download = "sloper.json";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      }, 100);
    },

    // 下载压缩包
    async downloadZipPackage(result) {
      try {
        this.uploadMessage = '正在生成压缩包...';
        this.messageType = 'info';

        const zip = new JSZip();
        const folderName = result.fileName.replace('.dxf', '');
        
        // 添加 Sloper JSON 文件
        const jsonStr = JSON.stringify(result.sloperJson, null, 2);
        // zip.file(`${result.fileName.replace('.dxf', '-sloper.json')}`, jsonStr);
        zip.file("sloper.json", jsonStr);
        
        // 将图片 URL 转换为 Blob 的辅助函数
        const urlToBlob = async (url) => {
          const response = await fetch(url);
          return await response.blob();
        };
        
        // 添加整体图片
        try {
          const overallImageBlob = await urlToBlob(result.overallImage.imageUrl);
          zip.file(`${folderName}-整体图片.png`, overallImageBlob);
        } catch (error) {
          console.warn('添加整体图片失败:', error);
        }
        
        // 添加子图片
        for (let i = 0; i < result.childImages.length; i++) {
          try {
            const childImage = result.childImages[i];
            const childImageBlob = await urlToBlob(childImage.imageUrl);
            
            // 按照下载所有图片的命名逻辑
            const textName = childImage.textsList.find(item => item.label === 'Piece Name');
            const curName = textName ? textName.value : '';
            const matchName = curName.match(/boke_(.*)/);
            const name = matchName ? matchName[1] : '未知裁片';
            const fileName = `${name}.png`;

            zip.file(`裁片图/${fileName}`, childImageBlob);
          } catch (error) {
            console.warn(`添加子图片 ${i + 1} 失败:`, error);
          }
        }
        
        // 生成并下载压缩包
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipFileName = `${folderName}.zip`;
        saveAs(zipBlob, zipFileName);
        
        this.uploadMessage = `压缩包 ${zipFileName} 下载完成`;
        this.messageType = 'success';
        
      } catch (error) {
        console.error('生成压缩包失败:', error);
        this.uploadMessage = '生成压缩包失败，请重试';
        this.messageType = 'error';
      }
    },

    // 下载全部ZIP包
    async downloadAllZipPackages() {
      if (this.processedResults.length === 0) {
        this.uploadMessage = '没有可下载的处理结果';
        this.messageType = 'warning';
        return;
      }

      try {
        this.uploadMessage = '正在生成全部压缩包...';
        this.messageType = 'info';
        
        const globalZip = new JSZip();
        
        // 将图片 URL 转换为 Blob 的辅助函数
        const urlToBlob = async (url) => {
          const response = await fetch(url);
          return await response.blob();
        };
        
        // 为每个处理结果创建文件夹
        for (const result of this.processedResults) {
          const folderName = result.fileName.replace('.dxf', '');
          
          // 添加 Sloper JSON 文件到对应文件夹
          const jsonStr = JSON.stringify(result.sloperJson, null, 2);
          globalZip.file(`${folderName}/sloper.json`, jsonStr);
          
          // 添加整体图片到对应文件夹
          try {
            const overallImageBlob = await urlToBlob(result.overallImage.imageUrl);
            globalZip.file(`${folderName}/整体图片.png`, overallImageBlob);
          } catch (error) {
            console.warn(`添加 ${folderName} 整体图片失败:`, error);
          }
          
          // 添加子图片到对应文件夹的裁片图子文件夹
          for (let i = 0; i < result.childImages.length; i++) {
            try {
              const childImage = result.childImages[i];
              const childImageBlob = await urlToBlob(childImage.imageUrl);
              
              // 按照下载所有图片的命名逻辑
              const textName = childImage.textsList.find(item => item.label === 'Piece Name');
              const curName = textName ? textName.value : '';
              const matchName = curName.match(/boke_(.*)/);
              const name = matchName ? matchName[1] : '未知裁片';
              const fileName = `${name}.png`;

              globalZip.file(`${folderName}/裁片图/${fileName}`, childImageBlob);
            } catch (error) {
              console.warn(`添加 ${folderName} 子图片 ${i + 1} 失败:`, error);
            }
          }
        }
        
        // 生成并下载全局压缩包
        const globalZipBlob = await globalZip.generateAsync({ type: 'blob' });
        const globalZipFileName = `全部DXF处理结果.zip`;
        saveAs(globalZipBlob, globalZipFileName);
        
        this.uploadMessage = `全部压缩包 ${globalZipFileName} 下载完成`;
        this.messageType = 'success';
        
      } catch (error) {
        console.error('生成全部压缩包失败:', error);
        this.uploadMessage = '生成全部压缩包失败，请重试';
        this.messageType = 'error';
      }
    }
  }
}
</script>

<style scoped>
.batch-uploader {
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

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 结果展示区域样式 */
.results-container {
  margin-top: 30px;
  background-color: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.results-container h3 {
  margin: 0;
  color: #333;
}

.download-all-btn {
  background-color: #ff5722;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: background-color 0.3s, transform 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.download-all-btn:hover {
  background-color: #e64a19;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.result-item {
  background-color: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 25px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #f0f0f0;
}

.result-header h4 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.result-actions {
  display: flex;
  gap: 10px;
}

.download-btn {
  background-color: #2196f3;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: background-color 0.3s;
}

.download-btn:hover {
  background-color: #1976d2;
}

.download-zip-btn {
  background-color: #ff9800;
}

.download-zip-btn:hover {
  background-color: #f57c00;
}

/* 整体图片区域 */
.overall-image-section {
  margin-bottom: 25px;
}

.overall-image-section h5 {
  margin: 0 0 15px 0;
  color: #555;
  font-size: 16px;
  font-weight: bold;
}

.overall-image {
  max-width: 100%;
  max-height: 400px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.overall-image:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

/* 子图片区域 */
.children-images-section h5 {
  margin: 0 0 15px 0;
  color: #555;
  font-size: 16px;
  font-weight: bold;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.child-image-item {
  background-color: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 10px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.child-image-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.image-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.child-image {
  max-width: 100%;
  max-height: 150px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 10px;
  transition: transform 0.2s;
}

.child-image:hover {
  transform: scale(1.05);
}

.image-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #666;
  width: 100%;
}

.image-type {
  background-color: #e3f2fd;
  color: #1565c0;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: bold;
  font-size: 11px;
}

.image-size {
  color: #999;
}

.download-single-btn {
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  margin-top: 5px;
  transition: background-color 0.3s;
}

.download-single-btn:hover {
  background-color: #45a049;
}

/* 预览模态框 */
.preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.preview-content {
  background-color: white;
  border-radius: 8px;
  max-width: 90%;
  max-height: 90%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 16px rgba(0,0,0,0.3);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #e0e0e0;
  background-color: #f5f5f5;
  border-radius: 8px 8px 0 0;
}

.preview-header h4 {
  margin: 0;
  color: #333;
}

.close-btn {
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background-color: #d32f2f;
}

.preview-image-container {
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  flex: 1;
  overflow: auto;
  min-height: 0;
}

.preview-image {
  max-width: 100%;
  max-height: calc(90vh - 120px);
  border-radius: 4px;
  object-fit: contain;
}

.preview-actions {
  padding: 15px 20px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: center;
  background-color: #f5f5f5;
  border-radius: 0 0 8px 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .images-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 10px;
  }
  
  .results-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .download-all-btn {
    width: 100%;
    text-align: center;
  }
  
  .result-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .result-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .overall-image {
    max-height: 250px;
  }
  
  .child-image {
    max-height: 120px;
  }
}
</style>
