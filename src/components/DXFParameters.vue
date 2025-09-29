<template>
  <div class="dxf-parameters">
    <h2>DXF参数设置</h2>

    <!-- 主料文件上传区域 -->
    <div class="upload-section">
      <div class="section-header">
        <h3>主料文件上传</h3>
        <div class="controls-row">
          <div class="offset-rotation-input">
            <label for="mainOffsetRotation">顺时针度数:</label>
            <input id="mainOffsetRotation" v-model.number="mainOffsetRotation" type="number" placeholder="顺时针度数"
              class="offset-rotation-field" min="-360" max="360" step="1" />
          </div>
          <div class="pattern-id-input">
            <label for="mainPatternId" :class="{ 'required': mainFiles.length > 0 }">
              主料上传ID:
              <span v-if="mainFiles.length > 0" class="required-mark">*</span>
            </label>
            <input id="mainPatternId" v-model="mainPatternId" type="number"
              :placeholder="mainFiles.length > 0 ? '必须输入主料PATTERN ID' : '请输入主料PATTERN ID'"
              :class="['pattern-id-field', { 'required-field': mainFiles.length > 0 }]" min="1" />
          </div>
        </div>
      </div>
      <div class="upload-area" :class="{ 'dragover': isDragOverMain }" @click="triggerFileInput('main')"
        @drop="handleDrop($event, 'main')" @dragover="handleDragOver($event, 'main')"
        @dragenter="handleDragEnter($event, 'main')" @dragleave="handleDragLeave($event, 'main')">
        <div class="upload-icon">📁</div>
        <div class="upload-text">
          <p class="primary-text">点击此区域选择主料文件</p>
          <p class="secondary-text">或拖拽文件/文件夹到此处</p>
          <p class="hint-text">支持多DXF文件批量上传</p>
        </div>
        <input type="file" ref="mainFileInput" multiple accept=".dxf" @change="handleFileUpload($event, 'main')"
          style="display: none;" />
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

          <!-- 基准比值按钮组和基准码选择器 -->
          <div v-if="mainAvailableSizes.length > 0" class="controls-container">
            <!-- 基准比值按钮组 -->
            <div class="ratio-selector">
              <label class="ratio-label">基准比值:</label>
              <div class="ratio-buttons">
                <button v-for="ratio in ratioOptions" :key="ratio.value"
                  :class="['ratio-btn', { 'active': mainSelectedRatioType === ratio.value }]"
                  @click="selectMainRatioType(ratio.value)">
                  {{ ratio.label }}
                </button>
              </div>
            </div>

            <!-- 基准码选择器 -->
            <div class="reference-selector">
              <label for="mainReferenceSize">基准码:</label>
              <select id="mainReferenceSize" v-model="mainSelectedReferenceSize" class="reference-select"
                @change="onMainReferenceSizeChange">
                <option v-for="size in mainAvailableSizes" :key="size" :value="size">
                  {{ size }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 辅料文件上传区域 -->
    <div class="upload-section">
      <div class="section-header">
        <h3>辅料文件上传</h3>
        <div class="controls-row">
          <div class="offset-rotation-input">
            <label for="auxOffsetRotation">顺时针度数:</label>
            <input id="auxOffsetRotation" v-model.number="auxOffsetRotation" type="number" placeholder="顺时针度数"
              class="offset-rotation-field" min="-360" max="360" step="1" />
          </div>
          <div class="pattern-id-input">
            <label for="auxPatternId" :class="{ 'required': auxFiles.length > 0 }">
              辅料上传ID:
              <span v-if="auxFiles.length > 0" class="required-mark">*</span>
            </label>
            <input id="auxPatternId" v-model="auxPatternId" type="number"
              :placeholder="auxFiles.length > 0 ? '必须输入辅料PATTERN ID' : '请输入辅料PATTERN ID'"
              :class="['pattern-id-field', { 'required-field': auxFiles.length > 0 }]" min="1" />
          </div>
        </div>
      </div>
      <div class="upload-area" :class="{ 'dragover': isDragOverAux }" @click="triggerFileInput('aux')"
        @drop="handleDrop($event, 'aux')" @dragover="handleDragOver($event, 'aux')"
        @dragenter="handleDragEnter($event, 'aux')" @dragleave="handleDragLeave($event, 'aux')">
        <div class="upload-icon">📁</div>
        <div class="upload-text">
          <p class="primary-text">点击此区域选择辅料文件</p>
          <p class="secondary-text">或拖拽文件/文件夹到此处</p>
          <p class="hint-text">支持多DXF文件批量上传</p>
        </div>
        <input type="file" ref="auxFileInput" multiple accept=".dxf" @change="handleFileUpload($event, 'aux')"
          style="display: none;" />
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

          <!-- 基准比值按钮组和基准码选择器 -->
          <div v-if="auxAvailableSizes.length > 0" class="controls-container">
            <!-- 基准比值按钮组 -->
            <div class="ratio-selector">
              <label class="ratio-label">基准比值:</label>
              <div class="ratio-buttons">
                <button v-for="ratio in ratioOptions" :key="ratio.value"
                  :class="['ratio-btn', { 'active': auxSelectedRatioType === ratio.value }]"
                  @click="selectAuxRatioType(ratio.value)">
                  {{ ratio.label }}
                </button>
              </div>
            </div>

            <!-- 基准码选择器 -->
            <div class="reference-selector">
              <label for="auxReferenceSize">基准码:</label>
              <select id="auxReferenceSize" v-model="auxSelectedReferenceSize" class="reference-select"
                @change="onAuxReferenceSizeChange">
                <option v-for="size in auxAvailableSizes" :key="size" :value="size">
                  {{ size }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 消息提示 -->
    <div v-if="uploadMessage" class="upload-message" :class="messageType">{{ uploadMessage }}</div>

    <!-- 处理状态加载提示 -->
    <div v-if="processing" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">正在预处理DXF文件...</div>
    </div>

    <!-- 全局操作按钮 -->
    <div v-if="mainFiles.length > 0 || auxFiles.length > 0" class="global-actions">
      <button class="clear-all-btn" @click="clearAllFiles" :disabled="processing">清空所有文件</button>
      <button class="reprocess-btn" @click="reprocessFiles" :disabled="processing">
        <span v-if="processing" class="loading-spinner-inline"></span>
        {{ processing ? '正在预处理...' : '再次预处理' }}
      </button>
      <button class="process-btn" @click="processFiles" :disabled="processing">
        <span v-if="processing" class="loading-spinner-inline"></span>
        {{ processing ? '正在处理...' : '处理文件' }}
      </button>
    </div>

    <!-- 处理结果展示区域 -->
    <div v-if="finalProcessedResults.mainFiles.length > 0 || finalProcessedResults.auxFiles.length > 0"
      class="results-container">
      <div class="results-header">
        <h3>处理结果</h3>
        <div class="header-actions">
          <button class="upload-all-btn" @click="uploadAllResults" :disabled="uploading">
            {{ uploading ? '上传中...' : '全部上传' }}
          </button>
          <button class="download-all-btn" @click="downloadAllZipPackages">
            下载全部ZIP包
          </button>
        </div>
      </div>

      <!-- 主料结果 -->
      <div v-if="finalProcessedResults.mainFiles.length > 0" class="material-section">
        <h4>主料文件 ({{ finalProcessedResults.mainFiles.length }} 个)</h4>
        <div class="material-info">
          <span>基准码: {{ mainSelectedReferenceSize }}</span>
          <span>基准比值: {{ getMainRatioTypeLabel() }}</span>
        </div>
        <div class="results-grid">
          <div v-for="(result, index) in finalProcessedResults.mainFiles" :key="`main-${index}`" class="result-item">
            <div class="result-header">
              <h5>{{ result.fileName }}</h5>
              <span class="file-size-badge">{{ result.size }}</span>
            </div>

            <!-- 整体图片 -->
            <div class="overall-image-section">
              <h6>整体图片</h6>
              <div class="image-container">
                <img :src="result.overallImage.imageUrl" :alt="`${result.fileName} - 整体图片`" class="overall-image"
                  @click="previewImage(result.overallImage.imageUrl, `${result.fileName} - 整体图片`)" />
                <div class="image-info">
                  <span>尺寸: {{ Math.round(result.overallImage.size.width) }} × {{
                    Math.round(result.overallImage.size.height) }} px</span>
                </div>
              </div>
            </div>

            <!-- 子图片网格 -->
            <div v-if="result.childImages.length > 0" class="children-images-section">
              <h6>子图片 ({{ result.childImages.length }} 个)</h6>
              <div class="images-grid">
                <div v-for="(childImage, childIndex) in result.childImages.slice(0, 4)" :key="childIndex"
                  class="child-image-item">
                  <div class="image-container">
                    <img :src="childImage.imageUrl" :alt="`${result.fileName} - 子图片 ${childIndex + 1}`"
                      class="child-image"
                      @click="previewImage(childImage.imageUrl, `${result.fileName} - 子图片 ${childIndex + 1}`)" />
                    <div class="image-info">
                      <span class="image-type">{{ childImage.type }}</span>
                      <span class="image-size">{{ Math.round(childImage.size.width) }} × {{
                        Math.round(childImage.size.height) }}</span>
                    </div>
                  </div>
                </div>
                <div v-if="result.childImages.length > 4" class="more-images">
                  +{{ result.childImages.length - 4 }} 更多
                </div>
              </div>
            </div>

            <div class="result-actions">
              <button class="upload-btn" @click="uploadSingleResult(result, 'main')" :disabled="uploading">
                {{ uploading ? '上传中...' : '单个上传' }}
              </button>
              <button class="download-btn" @click="downloadZipPackage(result, 'main')">
                下载压缩包
              </button>
              <button class="download-btn" @click="downloadAllImages(result)">
                下载所有图片
              </button>
              <button class="download-btn" @click="downloadSloperJson(result)">
                下载Sloper JSON
              </button>
              <button class="download-btn" @click="downloadModelingImages(result)">
                下载建模图
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 辅料结果 -->
      <div v-if="finalProcessedResults.auxFiles.length > 0" class="material-section">
        <h4>辅料文件 ({{ finalProcessedResults.auxFiles.length }} 个)</h4>
        <div class="material-info">
          <span>基准码: {{ auxSelectedReferenceSize }}</span>
          <span>基准比值: {{ getAuxRatioTypeLabel() }}</span>
        </div>
        <div class="results-grid">
          <div v-for="(result, index) in finalProcessedResults.auxFiles" :key="`aux-${index}`" class="result-item">
            <div class="result-header">
              <h5>{{ result.fileName }}</h5>
              <span class="file-size-badge">{{ result.size }}</span>
            </div>

            <!-- 整体图片 -->
            <div class="overall-image-section">
              <h6>整体图片</h6>
              <div class="image-container">
                <img :src="result.overallImage.imageUrl" :alt="`${result.fileName} - 整体图片`" class="overall-image"
                  @click="previewImage(result.overallImage.imageUrl, `${result.fileName} - 整体图片`)" />
                <div class="image-info">
                  <span>尺寸: {{ Math.round(result.overallImage.size.width) }} × {{
                    Math.round(result.overallImage.size.height) }} px</span>
                </div>
              </div>
            </div>

            <!-- 子图片网格 -->
            <div v-if="result.childImages.length > 0" class="children-images-section">
              <h6>子图片 ({{ result.childImages.length }} 个)</h6>
              <div class="images-grid">
                <div v-for="(childImage, childIndex) in result.childImages.slice(0, 4)" :key="childIndex"
                  class="child-image-item">
                  <div class="image-container">
                    <img :src="childImage.imageUrl" :alt="`${result.fileName} - 子图片 ${childIndex + 1}`"
                      class="child-image"
                      @click="previewImage(childImage.imageUrl, `${result.fileName} - 子图片 ${childIndex + 1}`)" />
                    <div class="image-info">
                      <span class="image-type">{{ childImage.type }}</span>
                      <span class="image-size">{{ Math.round(childImage.size.width) }} × {{
                        Math.round(childImage.size.height) }}</span>
                    </div>
                  </div>
                </div>
                <div v-if="result.childImages.length > 4" class="more-images">
                  +{{ result.childImages.length - 4 }} 更多
                </div>
              </div>
            </div>

            <div class="result-actions">
              <button class="upload-btn" @click="uploadSingleResult(result, 'aux')" :disabled="uploading">
                {{ uploading ? '上传中...' : '单个上传' }}
              </button>
              <button class="download-btn" @click="downloadZipPackage(result, 'aux')">
                下载压缩包
              </button>
              <button class="download-btn" @click="downloadAllImages(result)">
                下载所有图片
              </button>
              <button class="download-btn" @click="downloadSloperJson(result)">
                下载Sloper JSON
              </button>
              <button class="download-btn" @click="downloadModelingImages(result)">
                下载建模图
              </button>
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
  </div>
</template>

<script>
import { DXFAnalysis } from '@/utils/DXFAnalysis';
import { generateSloper, convertToJSON } from '@/utils/generateSloper';
import { generateCanvasSloper } from '@/utils/generateCanvasSloper';
import { generateAllCanvasSloper } from '@/utils/generateAllCanvasSloper';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { uploadImage } from '@/api/image';
import { getPatternDetail, createPart, updatePartSpecData, updatePartSizeData } from '@/api/parts';

export default {
  name: 'DXFParameters',
  data() {
    return {
      mainPatternId: '', // 主料上传ID
      auxPatternId: '', // 辅料上传ID
      mainOffsetRotation: 90, // 主料抵消度数（顺时针）
      auxOffsetRotation: 0, // 辅料抵消度数（顺时针）
      mainFiles: [], // 主料文件列表
      auxFiles: [], // 辅料文件列表
      isDragOverMain: false, // 主料区域拖拽状态
      isDragOverAux: false, // 辅料区域拖拽状态
      uploadMessage: '', // 上传消息
      messageType: 'info', // 消息类型: 'info', 'warning', 'error', 'success'
      processedMainFiles: [], // 预处理后的主料文件数据
      processedAuxFiles: [], // 预处理后的辅料文件数据
      mainAvailableSizes: [], // 主料可用的尺码选项
      auxAvailableSizes: [], // 辅料可用的尺码选项
      mainSelectedReferenceSize: '', // 主料选中的基准码
      auxSelectedReferenceSize: '', // 辅料选中的基准码
      ratioOptions: [ // 基准比值选项
        { label: '每项最大', value: 'itemMax' },
        { label: '每项最小', value: 'itemMin' },
        { label: '宽度', value: 'width' },
        { label: '高度', value: 'height' }
      ],
      mainSelectedRatioType: 'itemMax', // 主料默认选中每项最大
      auxSelectedRatioType: 'itemMax', // 辅料默认选中每项最大
      processing: false, // 文件预处理状态
      uploading: false, // 上传状态
      patternInitialized: null, // 记录已初始化的PATTERN_ID
      finalProcessedResults: { // 最终处理结果
        mainFiles: [],
        auxFiles: []
      },
      previewModal: {
        show: false,
        imageUrl: '',
        title: ''
      }
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
    async addFiles(files, type) {
      const validFiles = [];
      const invalidFiles = [];
      const targetArray = type === 'main' ? this.mainFiles : this.auxFiles;
      const processedArray = type === 'main' ? this.processedMainFiles : this.processedAuxFiles;

      // 显示处理状态
      this.processing = true;
      this.uploadMessage = `正在预处理${type === 'main' ? '主料' : '辅料'}文件...`;
      this.messageType = 'info';

      const processPromises = [];

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
            // 为每个有效文件创建预处理Promise，传入对应的抵消度数
            const offsetRotation = type === 'main' ? this.mainOffsetRotation : this.auxOffsetRotation;
            processPromises.push(this.preprocessDXFFile(file, offsetRotation));
          }
        } else {
          invalidFiles.push(file);
        }
      });

      // 处理DXF文件
      const processedResults = [];
      const failedProcesses = [];

      for (let i = 0; i < processPromises.length; i++) {
        try {
          const result = await processPromises[i];
          processedResults.push(result);
          processedArray.push(result);
        } catch (error) {
          console.error(`预处理文件失败:`, error);
          failedProcesses.push(validFiles[i].name);
        }
      }

      // 提取尺码选项
      this.extractSizeOptions();

      this.processing = false;

      // 显示添加结果
      const fileTypeName = type === 'main' ? '主料' : '辅料';

      if (validFiles.length > 0) {
        console.log(`已添加 ${validFiles.length} 个${fileTypeName}DXF文件，总计 ${targetArray.length} 个文件`);
        console.log(`成功预处理 ${processedResults.length} 个文件`);
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
          this.uploadMessage = `已添加 ${validFiles.length} 个${fileTypeName}DXF文件，已忽略 ${invalidFiles.length} 个非DXF文件。成功预处理 ${processedResults.length} 个文件`;
          this.messageType = 'warning';
        }
      } else if (validFiles.length > 0) {
        // 如果全部是有效文件，显示成功提示
        if (failedProcesses.length > 0) {
          this.uploadMessage = `成功添加 ${validFiles.length} 个${fileTypeName}DXF文件，但 ${failedProcesses.length} 个文件预处理失败`;
          this.messageType = 'warning';
        } else {
          this.uploadMessage = `成功添加并预处理 ${validFiles.length} 个${fileTypeName}DXF文件`;
          this.messageType = 'success';
        }
      }
    },

    // 移除文件
    removeFile(type, index) {
      if (type === 'main') {
        this.mainFiles.splice(index, 1);
        this.processedMainFiles.splice(index, 1);
      } else if (type === 'aux') {
        this.auxFiles.splice(index, 1);
        this.processedAuxFiles.splice(index, 1);
      }
      // 重新提取尺码选项
      this.extractSizeOptions();
    },

    // 清空指定类型的文件
    clearFiles(type) {
      if (type === 'main') {
        this.mainFiles = [];
        this.processedMainFiles = [];
      } else if (type === 'aux') {
        this.auxFiles = [];
        this.processedAuxFiles = [];
      }
      this.uploadMessage = '';
      // 重新提取尺码选项
      this.extractSizeOptions();
    },

    // 清空所有文件
    clearAllFiles() {
      this.mainFiles = [];
      this.auxFiles = [];
      this.processedMainFiles = [];
      this.processedAuxFiles = [];
      this.uploadMessage = '';
      this.mainAvailableSizes = [];
      this.auxAvailableSizes = [];
      this.mainSelectedReferenceSize = '';
      this.auxSelectedReferenceSize = '';
      // 清空处理结果展示区域
      this.finalProcessedResults = {
        mainFiles: [],
        auxFiles: []
      };
      // 重置版型初始化状态
      this.patternInitialized = null;

      // 重置抵消度数为默认值
      this.mainOffsetRotation = 90;
      this.auxOffsetRotation = 0;

      // 重置Pattern ID（可选，根据需求）
      // this.mainPatternId = '268';
      // this.auxPatternId = '268';
    },

    // 再次预处理文件
    async reprocessFiles() {
      if (this.mainFiles.length === 0 && this.auxFiles.length === 0) {
        this.uploadMessage = '请先上传文件';
        this.messageType = 'warning';
        return;
      }

      this.processing = true;
      this.uploadMessage = '正在重新预处理DXF文件...';
      this.messageType = 'info';

      try {
        // 清空现有预处理结果
        this.processedMainFiles = [];
        this.processedAuxFiles = [];

        // 清空处理结果展示区域
        this.finalProcessedResults = {
          mainFiles: [],
          auxFiles: []
        };

        const processPromises = [];
        const validFiles = [];
        const processedResults = [];
        const failedProcesses = [];

        // 重新预处理主料文件
        this.mainFiles.forEach(file => {
          validFiles.push(file);
          const offsetRotation = this.mainOffsetRotation;
          processPromises.push(this.preprocessDXFFile(file, offsetRotation));
        });

        // 重新预处理辅料文件
        this.auxFiles.forEach(file => {
          validFiles.push(file);
          const offsetRotation = this.auxOffsetRotation;
          processPromises.push(this.preprocessDXFFile(file, offsetRotation));
        });

        // 并行处理所有文件
        for (let i = 0; i < processPromises.length; i++) {
          try {
            const result = await processPromises[i];
            processedResults.push(result);

            // 判断是主料还是辅料文件
            const file = validFiles[i];
            if (this.mainFiles.includes(file)) {
              this.processedMainFiles.push(result);
            } else if (this.auxFiles.includes(file)) {
              this.processedAuxFiles.push(result);
            }
          } catch (error) {
            console.error(`重新预处理文件失败:`, error);
            failedProcesses.push(validFiles[i].name);
          }
        }

        // 重新提取尺码选项
        this.extractSizeOptions();

        this.processing = false;

        // 显示预处理结果
        if (failedProcesses.length > 0) {
          this.uploadMessage = `重新预处理完成，但 ${failedProcesses.length} 个文件处理失败`;
          this.messageType = 'warning';
        } else {
          this.uploadMessage = `重新预处理完成！成功处理 ${processedResults.length} 个文件`;
          this.messageType = 'success';
        }

        console.log('重新预处理完成，主料文件:', this.processedMainFiles.length, '个');
        console.log('重新预处理完成，辅料文件:', this.processedAuxFiles.length, '个');

      } catch (error) {
        console.error('重新预处理过程中出错:', error);
        this.uploadMessage = `重新预处理失败: ${error.message}`;
        this.messageType = 'error';
        this.processing = false;
      }
    },

    // 处理文件
    async processFiles() {
      if (this.mainFiles.length === 0 && this.auxFiles.length === 0) {
        this.uploadMessage = '请先上传文件';
        this.messageType = 'warning';
        return;
      }

      // 智能检查基准码选择 - 只检查有文件的材料类型
      const hasMainFiles = this.mainFiles.length > 0;
      const hasAuxFiles = this.auxFiles.length > 0;

      if (hasMainFiles && !this.mainSelectedReferenceSize) {
        this.uploadMessage = '检测到主料文件，请先选择主料基准码';
        this.messageType = 'warning';
        return;
      }

      if (hasAuxFiles && !this.auxSelectedReferenceSize) {
        this.uploadMessage = '检测到辅料文件，请先选择辅料基准码';
        this.messageType = 'warning';
        return;
      }

      this.processing = true;
      this.uploadMessage = '正在处理主料和辅料文件...';
      this.messageType = 'info';

      const processedResults = {
        mainFiles: [],
        auxFiles: []
      };

      try {
        // 处理主料文件
        if (this.mainFiles.length > 0) {
          console.log('开始处理主料文件，基准码:', this.mainSelectedReferenceSize, '基准比值:', this.mainSelectedRatioType);
          processedResults.mainFiles = await this.processFilesByType('main');
        }

        // 处理辅料文件
        if (this.auxFiles.length > 0) {
          console.log('开始处理辅料文件，基准码:', this.auxSelectedReferenceSize, '基准比值:', this.auxSelectedRatioType);
          processedResults.auxFiles = await this.processFilesByType('aux');
        }

        // 保存最终处理结果
        this.finalProcessedResults = processedResults;

        // 打印处理好的数据
        console.log('=== 处理完成的数据 ===');
        console.log('主料处理结果:', processedResults.mainFiles);
        console.log('辅料处理结果:', processedResults.auxFiles);

        // 构造处理完成的消息
        const mainCount = processedResults.mainFiles.length;
        const auxCount = processedResults.auxFiles.length;
        let message = '处理完成！';

        if (mainCount > 0 && auxCount > 0) {
          message = `处理完成！主料 ${mainCount} 个文件，辅料 ${auxCount} 个文件`;
        } else if (mainCount > 0) {
          message = `处理完成！主料 ${mainCount} 个文件`;
        } else if (auxCount > 0) {
          message = `处理完成！辅料 ${auxCount} 个文件`;
        }

        this.uploadMessage = message;
        this.messageType = 'success';

      } catch (error) {
        console.error('处理文件时出错:', error);
        this.uploadMessage = `处理失败: ${error.message}`;
        this.messageType = 'error';
      } finally {
        this.processing = false;
      }
    },

    // 按类型处理文件（主料或辅料）
    async processFilesByType(type) {
      const isMain = type === 'main';
      const files = isMain ? this.processedMainFiles : this.processedAuxFiles;
      const referenceSize = isMain ? this.mainSelectedReferenceSize : this.auxSelectedReferenceSize;
      const ratioType = isMain ? this.mainSelectedRatioType : this.auxSelectedRatioType;
      const sloperType = isMain ? 0 : 1; // 主料为0，辅料为1

      console.log(`处理${isMain ? '主料' : '辅料'}文件:`, files.length, '个');

      // 找到基准文件
      const referenceFile = files.find(file => file.size === referenceSize);

      if (!referenceFile) {
        throw new Error(`未找到尺码为 ${referenceSize} 的${isMain ? '主料' : '辅料'}基准文件`);
      }

      console.log(`找到${isMain ? '主料' : '辅料'}基准文件:`, referenceFile.fileName);

      // 深拷贝所有文件数据
      const processedFiles = files.map(file => this.deepClone(file));

      // 处理基准文件 - 将cut数组下所有子元素的zoom设为1，并设置sloper_type
      const baselineFile = processedFiles.find(file => file.size === referenceSize);
      if (baselineFile.sloperJson.cut && Array.isArray(baselineFile.sloperJson.cut)) {
        baselineFile.sloperJson.cut.forEach(cutItem => {
          if (cutItem && typeof cutItem === 'object') {
            cutItem.zoom = 1;
          }
        });
        // 设置sloper_type
        if (baselineFile.sloperJson.file_info) {
          baselineFile.sloperJson.file_info.sloper_type = sloperType;
        }
        console.log(`${isMain ? '主料' : '辅料'}基准文件zoom参数已全部设为1`);
      }

      const baselineJson = baselineFile.sloperJson;

      // 处理其他文件
      for (const file of processedFiles) {
        if (file.size === referenceSize) {
          // 基准文件已经处理过
          console.log(`${isMain ? '主料' : '辅料'}基准文件处理完成: ${file.fileName}`);
        } else {
          // 其他文件需要根据基准文件处理
          console.log(`开始处理非基准${isMain ? '主料' : '辅料'}文件: ${file.fileName}`);

          if (file.sloperJson.cut && Array.isArray(file.sloperJson.cut) &&
            baselineJson.cut && Array.isArray(baselineJson.cut)) {

            // 根据name匹配处理zoom
            this.processZoomByNameMatching(file.sloperJson, baselineJson, ratioType);

            console.log(`${isMain ? '主料' : '辅料'}文件 ${file.fileName} zoom处理完成`);
          }

          // 设置sloper_type
          if (file.sloperJson.file_info) {
            file.sloperJson.file_info.sloper_type = sloperType;
          }
        }
      }

      return processedFiles;
    },

    // 根据name匹配处理zoom参数（参考ChangingParameters的实现）
    processZoomByNameMatching(targetJson, baselineJson, ratioType) {
      console.log('目标JSON:', targetJson);
      console.log('基准JSON:', baselineJson);
      console.log('当前选择的基准比值:', ratioType);

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

        switch (ratioType) {
          case 'itemMax':
            targetItem.zoom = parseFloat(Math.max(
              targetItem.size.width / baselineItem.size.width,
              targetItem.size.height / baselineItem.size.height
            ).toFixed(3));
            break;
          case 'itemMin':
            targetItem.zoom = parseFloat(Math.min(
              targetItem.size.width / baselineItem.size.width,
              targetItem.size.height / baselineItem.size.height
            ).toFixed(3));
            break;
          case 'width':
            targetItem.zoom = parseFloat((targetItem.size.width / baselineItem.size.width).toFixed(3));
            break;
          case 'height':
            targetItem.zoom = parseFloat((targetItem.size.height / baselineItem.size.height).toFixed(3));
            break;
        }
      }

      console.log('zoom处理完成:', targetCut);
    },

    // 深拷贝函数
    deepClone(obj) {
      if (obj === null || typeof obj !== 'object') return obj;
      if (obj instanceof Date) return new Date(obj.getTime());
      if (obj instanceof Array) return obj.map(item => this.deepClone(item));
      if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            clonedObj[key] = this.deepClone(obj[key]);
          }
        }
        return clonedObj;
      }
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
    },

    // 预处理DXF文件
    async preprocessDXFFile(file, offsetRotation = 0) {
      try {
        // 处理DXF文件
        const dxf = await DXFAnalysis(file);
        const entityImage = generateAllCanvasSloper(dxf, offsetRotation);
        const entityImages = generateCanvasSloper(dxf, {
          bounds: entityImage.bounds,
          canvasBounds: entityImage.canvasBounds,
          scale: entityImage.scale
        }, offsetRotation);
        const sloperJson = generateSloper(file.name, { overall: entityImage, children: entityImages });

        return {
          fileName: file.name,
          originalDXF: dxf,
          size: sloperJson.file_info?.size || '未知',
          overallImage: entityImage,
          childImages: entityImages,
          sloperJson: sloperJson,
          offsetRotation
        };
      } catch (error) {
        console.error(`预处理文件 ${file.name} 失败:`, error);
        throw error;
      }
    },

    // 从预处理后的文件中提取尺码选项
    extractSizeOptions() {
      // 提取主料尺码
      const mainSizes = new Set();
      this.processedMainFiles.forEach(file => {
        if (file.size && file.size !== '未知') {
          mainSizes.add(file.size);
        }
      });
      this.mainAvailableSizes = Array.from(mainSizes).sort();

      // 提取辅料尺码
      const auxSizes = new Set();
      this.processedAuxFiles.forEach(file => {
        if (file.size && file.size !== '未知') {
          auxSizes.add(file.size);
        }
      });
      this.auxAvailableSizes = Array.from(auxSizes).sort();

      // 更新主料基准码选择
      if (!this.mainSelectedReferenceSize || !this.mainAvailableSizes.includes(this.mainSelectedReferenceSize)) {
        if (this.mainAvailableSizes.length > 0) {
          // 首先查找 5XL（不区分大小写）
          const fiveXL = this.mainAvailableSizes.find(size =>
            size && size.toString().toLowerCase() === '5xl'
          );
          this.mainSelectedReferenceSize = fiveXL || this.mainAvailableSizes[0];
        } else {
          this.mainSelectedReferenceSize = '';
        }
      }

      // 更新辅料基准码选择
      if (!this.auxSelectedReferenceSize || !this.auxAvailableSizes.includes(this.auxSelectedReferenceSize)) {
        if (this.auxAvailableSizes.length > 0) {
          // 首先查找 5XL（不区分大小写）
          const fiveXL = this.auxAvailableSizes.find(size =>
            size && size.toString().toLowerCase() === '5xl'
          );
          this.auxSelectedReferenceSize = fiveXL || this.auxAvailableSizes[0];
        } else {
          this.auxSelectedReferenceSize = '';
        }
      }

      console.log('主料尺码选项:', this.mainAvailableSizes);
      console.log('辅料尺码选项:', this.auxAvailableSizes);
      console.log('主料基准码:', this.mainSelectedReferenceSize);
      console.log('辅料基准码:', this.auxSelectedReferenceSize);
    },

    // 主料基准码选择改变时的处理
    onMainReferenceSizeChange() {
      console.log('主料基准码已更改为:', this.mainSelectedReferenceSize);
    },

    // 辅料基准码选择改变时的处理
    onAuxReferenceSizeChange() {
      console.log('辅料基准码已更改为:', this.auxSelectedReferenceSize);
    },

    // 选择主料基准比值类型
    selectMainRatioType(ratioType) {
      this.mainSelectedRatioType = ratioType;
      console.log('主料基准比值类型已更改为:', ratioType);
    },

    // 选择辅料基准比值类型
    selectAuxRatioType(ratioType) {
      this.auxSelectedRatioType = ratioType;
      console.log('辅料基准比值类型已更改为:', ratioType);
    },

    // 获取主料基准比值类型标签
    getMainRatioTypeLabel() {
      const ratioOption = this.ratioOptions.find(option => option.value === this.mainSelectedRatioType);
      return ratioOption ? ratioOption.label : this.mainSelectedRatioType;
    },

    // 获取辅料基准比值类型标签
    getAuxRatioTypeLabel() {
      const ratioOption = this.ratioOptions.find(option => option.value === this.auxSelectedRatioType);
      return ratioOption ? ratioOption.label : this.auxSelectedRatioType;
    },

    // 验证Pattern ID
    validatePatternId(id, type) {
      if (!id || !id.toString().trim()) {
        return false;
      }
      const numId = Number(id);
      if (isNaN(numId) || numId <= 0) {
        this.uploadMessage = `${type === 'main' ? '主料' : '辅料'}Pattern ID必须是大于0的数字`;
        this.messageType = 'error';
        return false;
      }
      return true;
    },

    // 延迟工具函数
    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
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
            const textsListJSON = convertToJSON(childImage.textsList);
            const textName = textsListJSON['pieceName'];
            const curName = textName ? textName : '';
            const matchName = curName.match(/boke_(.*)/);
            const name = matchName ? matchName[1] : '未知裁片';

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
      a.download = "sloper.json";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      }, 100);
    },

    // 下载建模图
    async downloadModelingImages(result) {
      try {
        console.log('下载建模图', result);
        this.uploadMessage = '正在生成建模图...';
        this.messageType = 'info';

        // 从result中获取原始文件和已有的处理数据
        const originalDXF = result.originalDXF;
        if (!originalDXF) {
          this.uploadMessage = '无法获取原始文件数据';
          this.messageType = 'error';
          return;
        }

        // 检查是否有已处理的数据可以复用
        if (!result.overallImage || !result.overallImage.bounds) {
          this.uploadMessage = '缺少预处理数据，请重新处理文件';
          this.messageType = 'error';
          return;
        }

        // 使用预处理时的参数来生成建模图，确保一致性
        const modelingImages = generateCanvasSloper(originalDXF, {
          bounds: result.overallImage.bounds,
          canvasBounds: result.overallImage.canvasBounds,
          scale: result.overallImage.scale
        }, result.offsetRotation, true); // 最后一个参数true表示fillInside

        if (!modelingImages || modelingImages.length === 0) {
          this.uploadMessage = '未能生成建模图';
          this.messageType = 'warning';
          return;
        }

        // 创建ZIP包
        const zip = new JSZip();
        const folderName = result.fileName.replace('.dxf', '') + '-建模图';

        // 将图片 URL 转换为 Blob 的辅助函数
        const urlToBlob = async (url) => {
          const response = await fetch(url);
          return await response.blob();
        };

        // 添加建模图到ZIP包
        for (let i = 0; i < modelingImages.length; i++) {
          try {
            const modelingImage = modelingImages[i];
            if (modelingImage.imageUrl) {
              const imageBlob = await urlToBlob(modelingImage.imageUrl);

              // 根据textsList生成文件名
              let fileName = `建模图_${i + 1}.png`;
              if (modelingImage.textsList && modelingImage.textsList.length > 0) {
                const textName = modelingImage.textsList[0];
                const curName = textName ? textName : '';
                const matchName = curName.match(/boke_(.*)/);
                const name = matchName ? matchName[1] : textName;
                fileName = name ? `${name}.png` : fileName;
              }

              zip.file(fileName, imageBlob);
            }
          } catch (error) {
            console.warn(`添加建模图 ${i + 1} 失败:`, error);
          }
        }

        // 生成并下载压缩包
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipFileName = `${folderName}.zip`;
        saveAs(zipBlob, zipFileName);

        this.uploadMessage = `压缩包 ${zipFileName} 下载完成`;
        this.messageType = 'success';

      } catch (error) {
        console.error('生成建模图失败:', error);
        this.uploadMessage = '生成建模图失败，请重试';
        this.messageType = 'error';
      }
    },

    // 下载单个压缩包
    async downloadZipPackage(result, type) {
      try {
        this.uploadMessage = '正在生成压缩包...';
        this.messageType = 'info';

        const zip = new JSZip();
        const folderName = result.fileName.replace('.dxf', '');

        // 添加 Sloper JSON 文件
        const jsonStr = JSON.stringify(result.sloperJson, null, 2);
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
            const textsListJSON = convertToJSON(childImage.textsList);
            const textName = textsListJSON['pieceName'];
            const curName = textName ? textName : '';
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

    // 下载全部ZIP包（主料和辅料按列表一对一配对）
    async downloadAllZipPackages() {
      if (this.finalProcessedResults.mainFiles.length === 0 && this.finalProcessedResults.auxFiles.length === 0) {
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

        // 按列表顺序一对一配对，以主料为基准
        const mainFiles = this.finalProcessedResults.mainFiles;
        const auxFiles = this.finalProcessedResults.auxFiles;
        const maxCount = Math.max(mainFiles.length, auxFiles.length);

        for (let i = 0; i < maxCount; i++) {
          const mainFile = mainFiles[i];
          const auxFile = auxFiles[i];

          // 使用主料的尺码作为文件夹名，如果没有主料则使用辅料的尺码
          const folderName = mainFile ? mainFile.size : (auxFile ? auxFile.size : `未知-${i + 1}`);

          // 处理主料文件
          if (mainFile) {
            // 添加主料JSON - sloper-正料-{尺码}.json
            const mainJsonStr = JSON.stringify(mainFile.sloperJson, null, 2);
            globalZip.file(`${folderName}/sloper-正料-${mainFile.size}.json`, mainJsonStr);

            // 添加主料整体图片 - 整体图片1.png
            try {
              const overallImageBlob = await urlToBlob(mainFile.overallImage.imageUrl);
              globalZip.file(`${folderName}/整体图片1.png`, overallImageBlob);
            } catch (error) {
              console.warn(`添加主料 ${mainFile.fileName} 整体图片失败:`, error);
            }

            // 添加主料子图片到面料1文件夹
            for (let j = 0; j < mainFile.childImages.length; j++) {
              try {
                const childImage = mainFile.childImages[j];
                const childImageBlob = await urlToBlob(childImage.imageUrl);

                const textsListJSON = convertToJSON(childImage.textsList);
                const textName = textsListJSON['pieceName'];
                const curName = textName ? textName : '';
                const matchName = curName.match(/boke_(.*)/);
                const name = matchName ? matchName[1] : '未知裁片';
                const fileName = `${name}.png`;

                globalZip.file(`${folderName}/面料1/${fileName}`, childImageBlob);
              } catch (error) {
                console.warn(`添加主料 ${mainFile.fileName} 子图片 ${j + 1} 失败:`, error);
              }
            }
          }

          // 处理辅料文件
          if (auxFile) {
            // 添加辅料JSON - sloper-辅料-{尺码}.json
            const auxJsonStr = JSON.stringify(auxFile.sloperJson, null, 2);
            globalZip.file(`${folderName}/sloper-辅料-${auxFile.size}.json`, auxJsonStr);

            // 添加辅料整体图片 - 整体图片2.png
            try {
              const overallImageBlob = await urlToBlob(auxFile.overallImage.imageUrl);
              globalZip.file(`${folderName}/整体图片2.png`, overallImageBlob);
            } catch (error) {
              console.warn(`添加辅料 ${auxFile.fileName} 整体图片失败:`, error);
            }

            // 添加辅料子图片到面料2文件夹
            for (let j = 0; j < auxFile.childImages.length; j++) {
              try {
                const childImage = auxFile.childImages[j];
                const childImageBlob = await urlToBlob(childImage.imageUrl);

                const textsListJSON = convertToJSON(childImage.textsList);
                const textName = textsListJSON['pieceName'];
                const curName = textName ? textName : '';
                const matchName = curName.match(/boke_(.*)/);
                const name = matchName ? matchName[1] : '未知裁片';
                const fileName = `${name}.png`;

                globalZip.file(`${folderName}/面料2/${fileName}`, childImageBlob);
              } catch (error) {
                console.warn(`添加辅料 ${auxFile.fileName} 子图片 ${j + 1} 失败:`, error);
              }
            }
          }
        }

        // 生成并下载全局压缩包
        const globalZipBlob = await globalZip.generateAsync({ type: 'blob' });
        const globalZipFileName = `主料辅料配对处理结果.zip`;
        saveAs(globalZipBlob, globalZipFileName);

        this.uploadMessage = `全部压缩包 ${globalZipFileName} 下载完成`;
        this.messageType = 'success';

      } catch (error) {
        console.error('生成全部压缩包失败:', error);
        this.uploadMessage = '生成全部压缩包失败，请重试';
        this.messageType = 'error';
      }
    },

    // 获取版型信息
    async getPatternDetailApi(pattern_id) {
      try {
        const response = await getPatternDetail({
          id: pattern_id
        });
        return response;
      } catch (error) {
        console.error('获取版型信息失败:', error);
        throw error;
      }
    },

    // 上传单个图片到服务器
    async uploadImageToServer(base64String) {
      try {
        const response = await uploadImage({
          base64_string: base64String,
          entryway: "cutting",
          new: 1
        });
        return response;
      } catch (error) {
        console.error('上传图片失败:', error);
        throw error;
      }
    },

    // 创建部件
    async createPartData(pattern_id, parts_json, part_group_name) {
      try {
        const response = await createPart({
          pattern_id,
          parts_json,
          part_group_name
        });
        return response;
      } catch (error) {
        console.error('创建部件失败:', error);
        throw error;
      }
    },

    // 更新部件规格数据
    async updatePartSpecDataApi(json) {
      try {
        const response = await updatePartSpecData({
          json
        });
        return response;
      } catch (error) {
        console.error('更新部件规格数据失败:', error);
        throw error;
      }
    },

    // 更新部件尺寸数据
    async updatePartSizeDataApi(json) {
      try {
        const response = await updatePartSizeData({
          json,
          sloper: 1,
          image: 1
        });
        return response.data;
      } catch (error) {
        console.error('更新部件尺寸数据失败:', error);
        throw error;
      }
    },

    // 单个结果上传
    async uploadSingleResult(result, type) {
      if (this.uploading) return;

      const patternId = type === 'main' ? this.mainPatternId : this.auxPatternId;

      // 验证Pattern ID
      if (!patternId || !patternId.toString().trim()) {
        this.uploadMessage = `请先设置${type === 'main' ? '主料' : '辅料'}上传ID`;
        this.messageType = 'warning';
        return;
      }

      // 验证Pattern ID的有效性
      if (!this.validatePatternId(patternId, type)) {
        return;
      }

      this.uploading = true;
      this.uploadMessage = `正在上传 ${result.fileName} 的图片...`;
      this.messageType = 'info';

      try {
        // 深拷贝结果数据
        const copiedResult = this.deepClone(result);

        // 获取版型信息
        const patternInfo = await this.getPatternDetailApi(patternId);
        console.log('版型信息:', patternInfo);

        // 上传整体图片
        if (copiedResult.overallImage && copiedResult.overallImage.imageUrl) {
          try {
            const { full_url } = await this.uploadImageToServer(copiedResult.overallImage.imageUrl);
            copiedResult.overallImage.imageUrl = full_url;
          } catch (error) {
            console.error('上传整体图片失败:', error);
          }
        }

        // 上传子图片（添加延迟避免请求过于频繁）
        if (copiedResult.sloperJson && copiedResult.sloperJson.cut && copiedResult.sloperJson.cut.length > 0) {
          for (let i = 0; i < copiedResult.sloperJson.cut.length; i++) {
            const subImage = copiedResult.sloperJson.cut[i];
            if (subImage.url) {
              try {
                // 每次上传前等待500ms，避免请求过于频繁
                if (i > 0) {
                  await this.delay(1000);
                }

                this.uploadMessage = `正在上传 ${result.fileName} 的子图片 ${i + 1}/${copiedResult.sloperJson.cut.length}...`;
                console.log(result.sloperJson.cut[i]);
                const { full_url } = await this.uploadImageToServer(subImage.url);
                copiedResult.childImages[i].url = full_url;
                copiedResult.sloperJson.cut[i].url = full_url;
              } catch (error) {
                console.error(`上传子图片 ${i + 1} 失败:`, error);
              }
            }
          }

          console.log('上传子图片完成:', copiedResult.sloperJson.cut);
        }

        // 初始化版型部位（只初始化一次）
        if (this.patternInitialized !== patternId && copiedResult.sloperJson && copiedResult.sloperJson.cut && copiedResult.sloperJson.cut.length > 0) {
          try {
            const parts_json = copiedResult.sloperJson.cut.map(item => ({
              name: item.name,
              cutting_name: item.name
            }));
            const materialType = type === 'main' ? '正料' : '辅料';
            await this.createPartData(
              Number(patternId),
              JSON.stringify(parts_json),
              `${copiedResult.sloperJson.file_info.sloper_name}-${materialType}-${new Date().getTime()}`
            );
            this.patternInitialized = patternId; // 标记为已初始化
            console.log(`版型部位已初始化，PATTERN_ID: ${patternId}`);
          } catch (error) {
            console.error('创建部件失败:', error);
            // 如果是因为已经存在而失败，也标记为已初始化
            if (error.message && (error.message.includes('已存在') || error.message.includes('exist'))) {
              this.patternInitialized = patternId;
              console.log(`版型部位已存在，标记为已初始化，PATTERN_ID: ${patternId}`);
            }
          }
        }

        // 更新版型尺码
        if (copiedResult.sloperJson) {
          try {
            const size = patternInfo.sizeList.find(item => item.size_name === copiedResult.sloperJson.file_info.size);
            const sizeJson = {
              [patternId]: {
                sloper_format: copiedResult.sloperJson,
                size_id: size.size_id,
                image: copiedResult.overallImage.imageUrl
              }
            };
            await this.updatePartSizeDataApi(JSON.stringify(sizeJson));
          } catch (error) {
            console.error('更新版型尺码失败:', error);
          }
        }

        // 更新版型明细数据
        if (copiedResult.sloperJson) {
          try {
            const data = copiedResult.sloperJson.cut.map(item => ({
              pattern_id: Number(patternId),
              size_name: copiedResult.sloperJson.file_info.size,
              part_name: item.name,
              image: item.url,
              profile: item.url,
              width: item.size.width,
              height: item.size.height
            }));
            await this.updatePartSpecDataApi(JSON.stringify(data));
          } catch (error) {
            console.error('更新版型明细数据失败:', error);
          }
        }

        // 打印上传后的数据
        console.log('上传完成后的数据:', copiedResult);

        this.uploadMessage = `${result.fileName} 上传完成`;
        this.messageType = 'success';

      } catch (error) {
        console.error('上传过程中出错:', error);
        this.uploadMessage = `${result.fileName} 上传失败: ${error.message}`;
        this.messageType = 'error';
      } finally {
        this.uploading = false;
      }
    },

    // 全部上传
    async uploadAllResults() {
      if (this.uploading) return;

      const totalFiles = this.finalProcessedResults.mainFiles.length + this.finalProcessedResults.auxFiles.length;
      if (totalFiles === 0) {
        this.uploadMessage = '没有可上传的处理结果';
        this.messageType = 'warning';
        return;
      }

      // 智能验证Pattern ID - 只验证有文件的材料类型
      const hasMainFiles = this.finalProcessedResults.mainFiles.length > 0;
      const hasAuxFiles = this.finalProcessedResults.auxFiles.length > 0;

      if (hasMainFiles && (!this.mainPatternId || !this.mainPatternId.toString().trim())) {
        this.uploadMessage = '检测到主料文件，请先设置主料上传ID';
        this.messageType = 'warning';
        return;
      }

      if (hasAuxFiles && (!this.auxPatternId || !this.auxPatternId.toString().trim())) {
        this.uploadMessage = '检测到辅料文件，请先设置辅料上传ID';
        this.messageType = 'warning';
        return;
      }

      // 验证Pattern ID的有效性
      if (hasMainFiles && !this.validatePatternId(this.mainPatternId, 'main')) {
        return;
      }

      if (hasAuxFiles && !this.validatePatternId(this.auxPatternId, 'aux')) {
        return;
      }

      this.uploading = true;
      this.uploadMessage = '正在批量上传所有文件...';
      this.messageType = 'info';

      try {
        let mainPatternInfo = null;
        let auxPatternInfo = null;

        // 根据需要获取版型信息
        if (this.finalProcessedResults.mainFiles.length > 0) {
          mainPatternInfo = await this.getPatternDetailApi(this.mainPatternId);
          console.log('主料版型信息:', mainPatternInfo);
        }

        if (this.finalProcessedResults.auxFiles.length > 0) {
          auxPatternInfo = await this.getPatternDetailApi(this.auxPatternId);
          console.log('辅料版型信息:', auxPatternInfo);
        }

        let processedCount = 0;

        // 处理主料文件
        for (let index = 0; index < this.finalProcessedResults.mainFiles.length; index++) {
          const result = this.finalProcessedResults.mainFiles[index];
          // 如果不是第一个文件，添加500ms延迟
          if (processedCount > 0) {
            await this.delay(1000);
          }
          this.uploadMessage = `正在处理主料文件 ${result.fileName} (${processedCount + 1}/${totalFiles})...`;
          await this.processUploadResult(result, mainPatternInfo, '正料', this.mainPatternId);
          processedCount++;
        }

        // 处理辅料文件
        for (let index = 0; index < this.finalProcessedResults.auxFiles.length; index++) {
          const result = this.finalProcessedResults.auxFiles[index];
          // 在每个文件之间添加500ms延迟
          if (processedCount > 0) {
            await this.delay(1000);
          }
          this.uploadMessage = `正在处理辅料文件 ${result.fileName} (${processedCount + 1}/${totalFiles})...`;
          await this.processUploadResult(result, auxPatternInfo, '辅料', this.auxPatternId);
          processedCount++;
        }

        console.log('全部上传完成');
        this.uploadMessage = `全部 ${totalFiles} 个文件上传完成`;
        this.messageType = 'success';

      } catch (error) {
        console.error('批量上传过程中出错:', error);
        this.uploadMessage = `批量上传失败: ${error.message}`;
        this.messageType = 'error';
      } finally {
        this.uploading = false;
      }
    },

    // 处理单个上传结果的通用方法
    async processUploadResult(result, patternInfo, materialType, patternId) {
      // 深拷贝结果数据
      const copiedResult = this.deepClone(result);

      // 上传整体图片
      if (copiedResult.overallImage && copiedResult.overallImage.imageUrl) {
        try {
          const { full_url } = await this.uploadImageToServer(copiedResult.overallImage.imageUrl);
          copiedResult.overallImage.imageUrl = full_url;
        } catch (error) {
          console.error(`上传 ${result.fileName} 整体图片失败:`, error);
        }
      }

      // 上传子图片（添加延迟避免请求过于频繁）
      if (copiedResult.sloperJson && copiedResult.sloperJson.cut && copiedResult.sloperJson.cut.length > 0) {
        for (let i = 0; i < copiedResult.sloperJson.cut.length; i++) {
          const subImage = copiedResult.sloperJson.cut[i];
          if (subImage.url) {
            try {
              // 每次上传前等待500ms，避免请求过于频繁
              if (i > 0) {
                await this.delay(1000);
              }
              const { full_url } = await this.uploadImageToServer(subImage.url);
              copiedResult.childImages[i].url = full_url;
              copiedResult.sloperJson.cut[i].url = full_url;
            } catch (error) {
              console.error(`上传 ${result.fileName} 子图片 ${i + 1} 失败:`, error);
            }
          }
        }
      }

      // 初始化版型部位（只初始化一次）
      if (this.patternInitialized !== patternId && copiedResult.sloperJson && copiedResult.sloperJson.cut && copiedResult.sloperJson.cut.length > 0) {
        try {
          const parts_json = copiedResult.sloperJson.cut.map(item => ({
            name: item.name,
            cutting_name: item.name
          }));
          await this.createPartData(
            Number(patternId),
            JSON.stringify(parts_json),
            `${copiedResult.sloperJson.file_info.sloper_name}-${materialType}`
          );
          this.patternInitialized = patternId; // 标记为已初始化
          console.log(`版型部位已初始化，PATTERN_ID: ${patternId}`);
        } catch (error) {
          console.error(`创建 ${result.fileName} 部件失败:`, error);
          // 如果是因为已经存在而失败，也标记为已初始化
          if (error.message && (error.message.includes('已存在') || error.message.includes('exist'))) {
            this.patternInitialized = patternId;
            console.log(`版型部位已存在，标记为已初始化，PATTERN_ID: ${patternId}`);
          }
        }
      }

      // 更新版型尺码
      if (copiedResult.sloperJson) {
        try {
          const size = patternInfo.sizeList.find(item => item.size_name === copiedResult.sloperJson.file_info.size);
          const sizeJson = {
            [patternId]: {
              sloper_format: copiedResult.sloperJson,
              size_id: size.size_id,
              image: copiedResult.overallImage.imageUrl
            }
          };
          await this.updatePartSizeDataApi(JSON.stringify(sizeJson));
        } catch (error) {
          console.error(`更新 ${result.fileName} 版型尺码失败:`, error);
        }
      }

      // 更新版型明细数据
      if (copiedResult.sloperJson) {
        try {
          const data = copiedResult.sloperJson.cut.map(item => ({
            pattern_id: Number(patternId),
            size_name: copiedResult.sloperJson.file_info.size,
            part_name: item.name,
            image: item.url,
            profile: item.url,
            width: item.size.width,
            height: item.size.height
          }));
          await this.updatePartSpecDataApi(JSON.stringify(data));
        } catch (error) {
          console.error(`更新 ${result.fileName} 版型明细数据失败:`, error);
        }
      }
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

/* 区域头部样式 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.upload-section h3 {
  color: #444;
  margin: 0;
  font-size: 20px;
  font-weight: 500;
  padding-bottom: 8px;
  flex: 1;
  min-width: 200px;
}

/* 控件行样式 */
.controls-row {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

/* 抵消度数输入框样式 */
.offset-rotation-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.offset-rotation-input label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
}

.offset-rotation-field {
  padding: 8px 12px;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  background-color: white;
  font-size: 14px;
  color: #374151;
  min-width: 120px;
  transition: all 0.2s ease;
}

.offset-rotation-field:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.offset-rotation-field::placeholder {
  color: #9ca3af;
}

/* Pattern ID输入框样式 */
.pattern-id-input {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pattern-id-input label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
  transition: color 0.2s ease;
}

.pattern-id-input label.required {
  color: #dc2626;
}

.required-mark {
  color: #ef4444;
  font-weight: bold;
  margin-left: 2px;
}

.pattern-id-field {
  padding: 8px 12px;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  background-color: white;
  font-size: 14px;
  color: #374151;
  min-width: 180px;
  transition: all 0.2s ease;
}

.pattern-id-field.required-field {
  border-color: #fbbf24;
  background-color: #fffbeb;
}

.pattern-id-field.required-field:focus {
  border-color: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
}

.pattern-id-field:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.pattern-id-field:invalid {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.pattern-id-field::placeholder {
  color: #9ca3af;
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

.file-size,
.file-type {
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
  align-items: center;
  flex-wrap: wrap;
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

.reprocess-btn {
  background: #ff9800;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.reprocess-btn:hover {
  background: #f57c00;
}

.reprocess-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
  opacity: 0.65;
}

.reprocess-btn:disabled:hover {
  background: #6c757d;
  transform: none;
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

.process-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
  opacity: 0.65;
}

.process-btn:disabled:hover {
  background: #6c757d;
  transform: none;
}

.clear-all-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
  opacity: 0.65;
}

.clear-all-btn:disabled:hover {
  background: #6c757d;
}

/* 内联加载器样式 */
.loading-spinner-inline {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid transparent;
  border-top: 2px solid #ffffff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 8px;
}

/* 控件容器样式 */
.controls-container {
  display: flex;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
  margin-left: auto;
}

/* 基准比值选择器样式 */
.ratio-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ratio-label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
}

.ratio-buttons {
  display: flex;
  gap: 4px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 2px;
  background-color: #f9fafb;
}

.ratio-btn {
  padding: 6px 12px;
  border: none;
  background-color: transparent;
  color: #6b7280;
  font-size: 12px;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.ratio-btn:hover {
  background-color: #e3f2fd;
  color: #374151;
}

.ratio-btn.active {
  background-color: #007bff;
  color: white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.ratio-btn.active:hover {
  background-color: #0056b3;
}

/* 基准码选择器样式 */
.reference-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.reference-selector label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
}

.reference-select {
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background-color: white;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  min-width: 120px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.reference-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
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
  border-top: 5px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  margin-top: 10px;
  color: white;
  font-size: 18px;
  font-weight: 500;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

/* 处理结果展示区域样式 */
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

.header-actions {
  display: flex;
  gap: 10px;
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
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.download-all-btn:hover {
  background-color: #e64a19;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.upload-all-btn {
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: background-color 0.3s, transform 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.upload-all-btn:hover:not(:disabled) {
  background-color: #45a049;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.upload-all-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.material-section {
  margin-bottom: 30px;
}

.material-section h4 {
  color: #333;
  margin-bottom: 10px;
  font-size: 18px;
  font-weight: 600;
}

.material-info {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
  font-size: 14px;
  color: #666;
}

.material-info span {
  background-color: #e8f4f8;
  padding: 4px 12px;
  border-radius: 20px;
  font-weight: 500;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.result-item {
  background-color: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid #f0f0f0;
}

.result-header h5 {
  margin: 0;
  color: #333;
  font-size: 16px;
}

.file-size-badge {
  background-color: #4caf50;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.overall-image-section {
  margin-bottom: 15px;
}

.overall-image-section h6,
.children-images-section h6 {
  margin: 0 0 10px 0;
  color: #555;
  font-size: 14px;
  font-weight: bold;
}

.overall-image {
  max-width: 100%;
  max-height: 200px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.overall-image:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.children-images-section {
  margin-bottom: 15px;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.child-image-item {
  background-color: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 8px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.child-image-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.child-image {
  max-width: 100%;
  max-height: 80px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 8px;
  transition: transform 0.2s;
}

.child-image:hover {
  transform: scale(1.05);
}

.image-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #666;
  text-align: center;
}

.image-type {
  background-color: #e3f2fd;
  color: #1565c0;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: bold;
  font-size: 10px;
}

.image-size {
  color: #999;
}

.more-images {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 20px 8px;
  font-size: 12px;
  color: #666;
  font-style: italic;
}

.result-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.download-btn {
  background-color: #2196f3;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.3s;
}

.download-btn:hover {
  background-color: #1976d2;
}

.upload-btn {
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.3s;
}

.upload-btn:hover:not(:disabled) {
  background-color: #45a049;
}

.upload-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

/* 预览模态框样式 */
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
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
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
</style>
