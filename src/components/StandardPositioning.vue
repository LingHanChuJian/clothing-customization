<template>
  <div class="json-uploader">
    <h2>生成标准定位框文件</h2>

    <div class="upload-area" :class="{ 'dragover': isDragOver }" @click="triggerFileInput" @drop="handleDrop"
      @dragover="handleDragOver" @dragenter="handleDragEnter" @dragleave="handleDragLeave">
      <div class="upload-icon">📁</div>
      <div class="upload-text">
        <p class="primary-text">点击此区域选择文件</p>
        <p class="secondary-text">或拖拽文件/文件夹到此处</p>
        <p class="hint-text">支持多JSON文件批量上传</p>
      </div>
      <input type="file" ref="fileInput" multiple accept=".json" @change="handleFileUpload" style="display: none;" />
    </div>

    <!-- 消息提示 -->
    <div v-if="uploadMessage" class="upload-message" :class="messageType">{{ uploadMessage }}</div>

    <!-- 文件配置区域 -->
    <div v-if="fileConfigs.length > 0" class="files-config-container">
      <h3>文件配置 ({{ fileConfigs.length }} 个文件)</h3>

      <div v-for="(fileConfig, index) in fileConfigs" :key="index" class="file-config-item">
        <div class="file-header">
          <h4>{{ fileConfig.fileName }}</h4>
          <button class="remove-btn" @click="removeFileConfig(index)">×</button>
        </div>

        <!-- Cut选择 -->
        <div class="form-group">
          <label>选择Cut项：</label>
          <div class="cut-selection-container">
            <div v-for="(cut, cutIndex) in fileConfig.cutOptions" :key="cutIndex" class="cut-option"
              :class="{ 'selected': fileConfig.selectedCuts.includes(cut.title) }"
              @click="toggleCutSelection(fileConfig, cut.title)">
              <div class="cut-checkbox">
                <svg v-if="fileConfig.selectedCuts.includes(cut.title)" class="check-icon" viewBox="0 0 20 20"
                  fill="currentColor">
                  <path fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd" />
                </svg>
              </div>
              <span class="cut-title">{{ cut.title }}</span>
            </div>
          </div>
        </div>

        <!-- 配置表单 -->
        <div class="config-form">
          <!-- 名称输入 -->
          <div class="form-section">
            <div class="form-group full-width">
              <label for="name">名称：</label>
              <input type="text" id="name" v-model="fileConfig.name" placeholder="请输入名称" class="form-input" />
            </div>
          </div>

          <!-- 坐标输入 -->
          <div class="form-section">
            <div class="form-row">
              <div class="form-group">
                <label>X：</label>
                <input type="number" v-model.number="fileConfig.x" placeholder="X" class="form-input" />
              </div>

              <div class="form-group">
                <label>Y：</label>
                <input type="number" v-model.number="fileConfig.y" placeholder="Y" class="form-input" />
              </div>
            </div>
          </div>

          <!-- 类型选择 -->
          <div class="form-section">
            <div class="form-group full-width">
              <label>类型：</label>
              <div class="type-selection-container">
                <div v-for="(type, typeIndex) in fileConfig.typeOptions" :key="typeIndex" class="type-option"
                  :class="{ 'selected': fileConfig.selectedTypes.includes(type.value) }"
                  @click="toggleTypeSelection(fileConfig, type.value)">
                  <div class="type-checkbox">
                    <svg v-if="fileConfig.selectedTypes.includes(type.value)" class="check-icon" viewBox="0 0 20 20"
                      fill="currentColor">
                      <path fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd" />
                    </svg>
                  </div>
                  <span class="type-title">{{ type.label }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 尺寸设置 -->
          <div class="form-section">
            <div class="form-group full-width">
              <label>尺寸：</label>
              <div class="size-selector">
                <div class="size-options">
                  <label class="size-option" :class="{ 'selected': fileConfig.sizeType === 'auto' }">
                    <input type="radio" value="auto" v-model="fileConfig.sizeType" />
                    <span class="option-text">与cut宽高一致</span>
                  </label>
                  <label class="size-option custom-option" :class="{ 'selected': fileConfig.sizeType === 'custom' }">
                    <input type="radio" value="custom" v-model="fileConfig.sizeType" />
                    <span class="option-text">自定义</span>
                  </label>
                </div>
                <div v-if="fileConfig.sizeType === 'custom'" class="custom-size-panel">
                  <div class="size-input-group">
                    <input type="number" v-model.number="fileConfig.customWidth" placeholder="宽度" class="size-input"
                      min="0" />
                    <span class="dimension-separator">×</span>
                    <input type="number" v-model.number="fileConfig.customHeight" placeholder="高度" class="size-input"
                      min="0" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 位置和大小选择 -->
          <div class="form-section">
            <div class="form-row">
              <div class="form-group">
                <label>位置：</label>
                <select v-model="fileConfig.position" class="form-select">
                  <option value="">请选择位置</option>
                  <option v-for="(position, posIndex) in fileConfig.positionOptions" :key="posIndex"
                    :value="position.value">
                    {{ position.label }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label>大小：</label>
                <select v-model="fileConfig.size" class="form-select">
                  <option value="">请选择大小</option>
                  <option v-for="(size, sizeIndex) in fileConfig.sizeOptions" :key="sizeIndex" :value="size.value">
                    {{ size.label }}
                  </option>
                </select>
              </div>
            </div>
            <button class="form-confirm-btn" @click="submitAllConfigs">
              确定
            </button>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="file-actions">
          <button class="form-confirm-btn" @click="processFileConfig(fileConfig, index)">
            生成定位框文件
          </button>
        </div>
      </div>
    </div>

    <!-- 批量处理按钮 -->
    <div v-if="fileConfigs.length > 0" class="batch-actions">
      <button class="batch-process-btn" @click="processAllFiles">
        批量处理所有文件 ({{ fileConfigs.length }} 个)
      </button>
    </div>

    <!-- 配置数据表格 -->
    <div v-if="totalTableDataCount > 0" class="tables-container">
      <h3>配置数据表格 ({{ totalTableDataCount }} 项)</h3>

      <div v-for="(fileConfig, fileIndex) in fileConfigs" :key="fileIndex" class="file-table-section">
        <div
          v-if="fileTableData[fileConfig.fileName] && Array.isArray(fileTableData[fileConfig.fileName]) && fileTableData[fileConfig.fileName].length > 0">
          <h4 class="file-table-title">{{ fileConfig.fileName }} ({{ fileTableData[fileConfig.fileName].length }} 项)
          </h4>
          <div class="table-container">
            <div class="table-wrapper">
              <table class="config-table">
                <colgroup>
                  <col><!-- 裁片 -->
                  <col><!-- 名称 -->
                  <col><!-- 宽度 -->
                  <col><!-- 高度 -->
                  <col><!-- X -->
                  <col><!-- Y -->
                  <col><!-- 类型 -->
                  <col><!-- 位置 -->
                  <col><!-- 大小 -->
                  <col><!-- 操作 -->
                </colgroup>
                <thead>
                  <tr>
                    <th>裁片</th>
                    <th>名称</th>
                    <th>宽度</th>
                    <th>高度</th>
                    <th>X</th>
                    <th>Y</th>
                    <th>类型</th>
                    <th>位置</th>
                    <th>大小</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in getProcessedTableData(fileConfig.fileName)"
                    :key="`${fileConfig.fileName}-${index}`" class="table-row">
                    <!-- 裁片 - 合并单元格显示 -->
                    <td v-if="item.showCutCell" class="cut-cell merged-cell" :rowspan="item.cutRowspan">
                      <div class="cut-list">
                        {{ item.selectedCuts[0] || '-' }}
                      </div>
                    </td>

                    <!-- 名称 -->
                    <td>
                      <input v-if="item.isEditing" v-model="item.name" class="table-input" placeholder="名称" />
                      <span v-else>{{ item.name }}</span>
                    </td>

                    <!-- 宽度 -->
                    <td>
                      <input v-if="item.isEditing" v-model.number="item.customWidth" type="number" class="table-input"
                        placeholder="宽" />
                      <span v-else>{{ getWidthDisplay(item) }}</span>
                    </td>

                    <!-- 高度 -->
                    <td>
                      <input v-if="item.isEditing" v-model.number="item.customHeight" type="number" class="table-input"
                        placeholder="高" />
                      <span v-else>{{ getHeightDisplay(item) }}</span>
                    </td>

                    <!-- X坐标 -->
                    <td>
                      <input v-if="item.isEditing" v-model.number="item.x" type="number" class="table-input"
                        placeholder="X" />
                      <span v-else>{{ item.x || 0 }}</span>
                    </td>

                    <!-- Y坐标 -->
                    <td>
                      <input v-if="item.isEditing" v-model.number="item.y" type="number" class="table-input"
                        placeholder="Y" />
                      <span v-else>{{ item.y || 0 }}</span>
                    </td>

                    <!-- 类型 - 多行显示 -->
                    <td class="multi-line-cell">
                      <div v-if="item.isEditing" class="table-type-selection">
                        <div v-for="(type, typeIndex) in getTypeOptions()" :key="typeIndex" class="table-type-option"
                          :class="{ 'selected': item.selectedTypes.includes(type.value) }"
                          @click="toggleTypeSelection(item, type.value)">
                          <div class="table-type-checkbox">
                            <svg v-if="item.selectedTypes.includes(type.value)" class="check-icon" viewBox="0 0 20 20"
                              fill="currentColor">
                              <path fill-rule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clip-rule="evenodd" />
                            </svg>
                          </div>
                          <span class="table-type-title">{{ type.label }}</span>
                        </div>
                      </div>
                      <div v-else class="type-list">
                        <div v-for="(type, typeIndex) in item.selectedTypes" :key="typeIndex" class="type-tag">
                          {{ getTypeLabel(type) }}
                        </div>
                      </div>
                    </td>

                    <!-- 位置 -->
                    <td>
                      <select v-if="item.isEditing" v-model="item.position" class="table-select">
                        <option value="">选择位置</option>
                        <option v-for="(pos, posIndex) in getPositionOptions()" :key="posIndex" :value="pos.value">
                          {{ pos.label }}
                        </option>
                      </select>
                      <span v-else>{{ getPositionLabel(item.position) }}</span>
                    </td>

                    <!-- 大小 -->
                    <td>
                      <select v-if="item.isEditing" v-model="item.size" class="table-select">
                        <option value="">选择大小</option>
                        <option v-for="(size, sizeIndex) in getSizeOptions()" :key="sizeIndex" :value="size.value">
                          {{ size.label }}
                        </option>
                      </select>
                      <span v-else>{{ getSizeLabel(item.size) }}</span>
                    </td>

                    <!-- 操作 -->
                    <td class="action-cell">
                      <div class="action-buttons">
                        <button v-if="item.isEditing" @click="finishEdit(fileConfig.fileName, item.originalIndex)"
                          class="action-btn complete-btn">
                          完成
                        </button>
                        <button v-else @click="startEdit(fileConfig.fileName, item.originalIndex)"
                          class="action-btn edit-btn">
                          编辑
                        </button>
                        <button @click="deleteItem(fileConfig.fileName, item.originalIndex)"
                          class="action-btn delete-btn">
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 生成结果展示区域 -->
    <div v-if="processedResults.length > 0" class="results-container">
      <h3>生成结果 ({{ processedResults.length }} 个文件)</h3>
      <div v-for="(result, index) in processedResults" :key="index" class="result-item">
        <div class="result-header">
          <div class="result-info">
            <h4>{{ result.fileName }}</h4>
            <span class="process-time">处理时间: {{ result.processedAt }}</span>
          </div>
          <div class="result-actions">
            <button class="preview-btn" @click="togglePreview(index)" :class="{ active: result.showPreview }">
              {{ result.showPreview ? '收起预览' : '预览JSON' }}
            </button>
            <button class="download-btn" @click="downloadProcessedFile(result)">
              下载JSON文件
            </button>
          </div>
        </div>
        <div v-if="result.showPreview" class="result-content">
          <div class="json-stats">
            <span>文件大小: {{ getJsonSize(result.data) }}</span>
            <span>Cut项数: {{ result.data.cut ? result.data.cut.length : 0 }}</span>
            <span>总Layer数: {{ getTotalLayers(result.data) }}</span>
          </div>
          <div class="json-preview">
            <pre>{{ JSON.stringify(result.data, null, 2) }}</pre>
          </div>
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
const typeList = [
  {
    "name": "设计图库",
    "value": "design",
    "list": []
  },
  {
    "name": "艺术字",
    "value": "text",
    "list": [
      {
        "id": 51,
        "type": "text",
        "name": "尺码",
        "tag": "text",
        "type_text": "艺术字"
      },
      {
        "id": 49,
        "type": "text",
        "name": "码标",
        "tag": "group",
        "type_text": "艺术字"
      },
      {
        "id": 48,
        "type": "text",
        "name": "裤腰",
        "tag": "group",
        "type_text": "艺术字"
      },
      {
        "id": 47,
        "type": "text",
        "name": "螺纹",
        "tag": "group",
        "type_text": "艺术字"
      },
      {
        "id": 43,
        "type": "text",
        "name": "姓名",
        "tag": "text",
        "type_text": "艺术字"
      },
      {
        "id": 42,
        "type": "text",
        "name": "号码",
        "tag": "text",
        "type_text": "艺术字"
      },
      {
        "id": 41,
        "type": "text",
        "name": "队名",
        "tag": "text",
        "type_text": "艺术字"
      },
      {
        "id": 39,
        "type": "text",
        "name": "姓名号码",
        "tag": "group",
        "type_text": "艺术字"
      },
      {
        "id": 38,
        "type": "text",
        "name": "队名号码",
        "tag": "group",
        "type_text": "艺术字"
      }
    ]
  },
  {
    "name": "颜色",
    "value": "color",
    "list": [
      {
        "id": 22,
        "type": "color",
        "name": "纯色",
        "tag": "color",
        "type_text": "颜色"
      },
      {
        "id": 21,
        "type": "color",
        "name": "渐变色",
        "tag": "color",
        "type_text": "颜色"
      }
    ]
  },
  {
    "name": "底纹",
    "value": "texture",
    "list": [
      {
        "id": 52,
        "type": "texture",
        "name": "印花",
        "tag": "image",
        "type_text": "底纹"
      },
      {
        "id": 50,
        "type": "texture",
        "name": "容器参考框",
        "tag": "image",
        "type_text": "底纹"
      },
      {
        "id": 46,
        "type": "texture",
        "name": "logo",
        "tag": "image",
        "type_text": "底纹"
      },
      {
        "id": 45,
        "type": "texture",
        "name": "侧边条",
        "tag": "image",
        "type_text": "底纹"
      },
      {
        "id": 44,
        "type": "texture",
        "name": "特殊元素",
        "tag": "image",
        "type_text": "底纹"
      },
      {
        "id": 34,
        "type": "texture",
        "name": "局部底纹",
        "tag": "image",
        "type_text": "底纹"
      },
      {
        "id": 33,
        "type": "texture",
        "name": "满铺底纹",
        "tag": "image",
        "type_text": "底纹"
      }
    ]
  }
]


export default {
  name: 'StandardPositioning',
  data() {
    return {
      loading: false,
      isDragOver: false,
      uploadMessage: '',
      messageType: 'info', // 可以是 'info', 'warning', 'error', 'success'
      fileConfigs: [], // 存储文件配置
      processedResults: [], // 存储处理后的结果
      fileTableData: {} // 存储每个文件对应的表格数据 { fileName: [tableData] }
    }
  },
  computed: {
    // 获取所有文件的表格数据总数
    totalTableDataCount() {
      let total = 0;
      Object.values(this.fileTableData).forEach(tableArray => {
        if (tableArray && Array.isArray(tableArray)) {
          total += tableArray.length;
        }
      });
      return total;
    }
  },
  methods: {
    triggerFileInput() {
      this.$refs.fileInput.click();
    },

    handleFileUpload(event) {
      const files = Array.from(event.target.files);
      this.processFiles(files);
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
          this.processFiles(allFiles);
        });
      } else {
        // 兜底：如果 items 不可用，使用 files（仅支持直接文件拖拽）
        const droppedFiles = Array.from(event.dataTransfer.files);
        if (droppedFiles.length > 0) {
          this.processFiles(droppedFiles);
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

    async processFiles(files) {
      this.loading = true;
      const validFiles = [];
      const invalidFiles = [];

      // 筛选有效的JSON文件
      files.forEach(file => {
        if (file.name.toLowerCase().endsWith('.json')) {
          validFiles.push(file);
        } else {
          invalidFiles.push(file);
        }
      });

      if (validFiles.length === 0) {
        this.uploadMessage = '只支持上传JSON格式的文件，请重新选择';
        this.messageType = 'error';
        this.loading = false;
        return;
      }

      // 处理每个JSON文件
      for (const file of validFiles) {
        try {
          const fileContent = await this.readFileAsText(file);
          const jsonData = JSON.parse(fileContent);

          // 解析cut数组
          const cutOptions = jsonData.cut || [];

          // 创建文件配置对象
          const fileConfig = {
            fileName: file.name,
            originalData: jsonData,
            cutOptions: cutOptions,
            selectedCuts: [],
            name: '',
            typeOptions: [
              { label: '尺码', value: '尺码' },
              { label: '码标', value: '码标' },
              { label: '裤腰', value: '裤腰' },
              { label: '螺纹', value: '螺纹' },
              { label: '姓名', value: '姓名' },
              { label: '号码', value: '号码' },
              { label: '队名', value: '队名' },
              { label: '姓名号码', value: '姓名号码' },
              { label: '队名号码', value: '队名号码' },
              { label: '纯色', value: '纯色' },
              { label: '渐变色', value: '渐变色' },
              { label: '印花', value: '印花' },
              { label: 'logo', value: 'logo' },
              { label: '侧边条', value: '侧边条' },
              { label: '特殊元素', value: '特殊元素' }
            ],
            selectedTypes: [],
            sizeType: 'auto', // 默认与cut宽高一致
            customWidth: null,
            customHeight: null,
            positionOptions: [
              { label: '居左顶部位置对齐(left_top)', value: 'left_top' },
              { label: '居左垂直居中对齐(left_vertical)', value: 'left_vertical' },
              { label: '居左底部位置对齐(left_bottom)', value: 'left_bottom' },
              { label: '水平居中顶部位置对齐(middle_top)', value: 'middle_top' },
              { label: '水平居中垂直居中对齐(middle_vertical)', value: 'middle_vertical' },
              { label: '水平居中底部位置对齐(middle_bottom)', value: 'middle_bottom' },
              { label: '居右顶部位置对齐(right_top)', value: 'right_top' },
              { label: '居右垂直居中对齐(right_vertical)', value: 'right_vertical' },
              { label: '居右底部位置对齐(right_bottom)', value: 'right_bottom' }
            ],
            position: '',
            sizeOptions: [
              { label: '固定大小(set)', value: 'set' },
              { label: '等比缩放(scale)', value: 'scale' },
              { label: 'Logo waistband', value: 'waistband' },
              { label: '裤腰(waistband)', value: 'waistband' }
            ],
            size: '',
            x: 0,
            y: 0
          };

          this.fileConfigs.push(fileConfig);

        } catch (error) {
          console.error(`解析文件 ${file.name} 失败:`, error);
          this.uploadMessage = `文件 ${file.name} 解析失败，请检查JSON格式`;
          this.messageType = 'error';
        }
      }

      if (invalidFiles.length > 0) {
        this.uploadMessage = `成功加载 ${validFiles.length} 个JSON文件，已忽略 ${invalidFiles.length} 个非JSON文件`;
        this.messageType = 'warning';
      } else {
        this.uploadMessage = `成功加载 ${validFiles.length} 个JSON文件`;
        this.messageType = 'success';
      }

      this.loading = false;
    },

    removeFileConfig(index) {
      this.fileConfigs.splice(index, 1);
    },

    clearAll() {
      this.fileConfigs = [];
      this.uploadMessage = '';
      this.processedResults = [];
    },

    processFileConfig(fileConfig, index) {
      // 检查当前文件是否有表格数据
      const currentFileTableData = this.fileTableData[fileConfig.fileName];
      if (!currentFileTableData || currentFileTableData.length === 0) {
        this.uploadMessage = `文件 ${fileConfig.fileName} 没有对应的表格数据，请先提交配置到表格`;
        this.messageType = 'warning';
        return;
      }

      console.log('当前文件的JSON拷贝:', fileConfig.originalData);
      console.log('挂载的表格数据数组:', currentFileTableData);
      console.log('当前文件索引:', index);

      // 深拷贝 originalData
      const processedData = JSON.parse(JSON.stringify(fileConfig.originalData));

      const list = typeList.reduce((total, item) => {
        // 合并下面所有 list
        return total.concat(item.list)
      }, [])

      const cuts = processedData.cut

      for (let i = 0; i < cuts.length; i++) {
        const cutItem = cuts[i]
        if (!cutItem.layers) {
          cutItem.layers = []
        }

        for (let y = 0; y < currentFileTableData.length; y++) {
          const tableItem = currentFileTableData[y]
          if (!tableItem.selectedCuts.includes(cutItem.title)) continue

          const types = tableItem.selectedTypes.reduce((total, item) => {
            const typeItem = list.find(listItem => listItem.name === item)
            if (total[typeItem.tag]) {
              const arr = total[typeItem.tag].split(',')
              arr.push(typeItem.id)
              total[typeItem.tag] = arr.join(',')
            } else {
              total[typeItem.tag] = `${typeItem.id}`
            }
            return total
          }, {})

          const contentType = Object.values(types).join(',')
          const contentArray = []

          for (const type of Object.values(types)) {
            const arr = type.split(',')

            for (const typeItem of arr) {
              const listItem = list.find(listItem => listItem.id === Number(typeItem))
              if (!listItem) continue
              contentArray.push({
                ...listItem,
                value: listItem.id,
                label: listItem.name
              })
            }
          }

          const layer = {
            title: tableItem.name,
            name: tableItem.name,
            content: {
              type: types
            },
            position: {
              x: tableItem.x,
              y: tableItem.y
            },
            size: {
              width: tableItem.customWidth || cutItem.size.width,
              height: tableItem.customHeight || cutItem.size.height
            },
            pushCode: {
              pushDisplay: "",
              pushPosition: tableItem.position,
              pushSize: tableItem.size
            },
            editable: true,
            contentType,
            contentArray,
            tag: "Rect",
            fill: {
              url: "#32cd79"
            }
          }

          cutItem.layers.push(layer)
        }
      }

      // 检查是否已存在相同文件名的处理结果
      const existingResultIndex = this.processedResults.findIndex(result => result.fileName === fileConfig.fileName);

      if (existingResultIndex >= 0) {
        // 更新已存在的结果
        this.processedResults[existingResultIndex] = {
          fileName: fileConfig.fileName,
          data: processedData,
          processedAt: new Date().toLocaleString(),
          showPreview: this.processedResults[existingResultIndex].showPreview || false
        };
      } else {
        // 添加新的处理结果
        this.processedResults.push({
          fileName: fileConfig.fileName,
          data: processedData,
          processedAt: new Date().toLocaleString(),
          showPreview: false
        });
      }

      this.uploadMessage = `处理完成 ${fileConfig.fileName}，找到 ${currentFileTableData.length} 条对应的表格数据`;
      this.messageType = 'success';
    },

    // 批量处理所有文件
    processAllFiles() {
      let processedCount = 0;
      let errorCount = 0;
      const errors = [];

      this.fileConfigs.forEach((fileConfig) => {
        try {
          // 检查当前文件是否有表格数据
          const currentFileTableData = this.fileTableData[fileConfig.fileName];
          if (!currentFileTableData || currentFileTableData.length === 0) {
            errors.push(`文件 ${fileConfig.fileName} 没有对应的表格数据`);
            errorCount++;
            return;
          }

          // 深拷贝 originalData
          const processedData = JSON.parse(JSON.stringify(fileConfig.originalData));

          const list = typeList.reduce((total, item) => {
            // 合并下面所有 list
            return total.concat(item.list)
          }, [])

          const cuts = processedData.cut

          for (let i = 0; i < cuts.length; i++) {
            const cutItem = cuts[i]
            if (!cutItem.layers) {
              cutItem.layers = []
            }

            for (let y = 0; y < currentFileTableData.length; y++) {
              const tableItem = currentFileTableData[y]
              if (!tableItem.selectedCuts.includes(cutItem.title)) continue

              const types = tableItem.selectedTypes.reduce((total, item) => {
                const typeItem = list.find(listItem => listItem.name === item)
                if (total[typeItem.tag]) {
                  const arr = total[typeItem.tag].split(',')
                  arr.push(typeItem.id)
                  total[typeItem.tag] = arr.join(',')
                } else {
                  total[typeItem.tag] = `${typeItem.id}`
                }
                return total
              }, {})

              const contentType = Object.values(types).join(',')
              const contentArray = []

              for (const type of Object.values(types)) {
                const arr = type.split(',')
                for (const typeItem of arr) {
                  const listItem = list.find(listItem => listItem.id === Number(typeItem))
                  if (!listItem) continue
                  contentArray.push({
                    ...listItem,
                    value: listItem.id,
                    label: listItem.name
                  })
                }
              }

              const layer = {
                name: tableItem.name,
                content: {
                  type: types
                },
                position: {
                  x: tableItem.x,
                  y: tableItem.y
                },
                size: {
                  width: tableItem.customWidth || cutItem.size.width,
                  height: tableItem.customHeight || cutItem.size.height
                },
                pushCode: {
                  pushDisplay: "",
                  pushPosition: tableItem.position,
                  pushSize: tableItem.size
                },
                editable: true,
                contentType,
                tag: "Rect",
                fill: {
                  url: "#32cd79"
                },
                contentArray,
              }

              cutItem.layers.push(layer)
            }
          }

          // 检查是否已存在相同文件名的处理结果
          const existingResultIndex = this.processedResults.findIndex(result => result.fileName === fileConfig.fileName);

          if (existingResultIndex >= 0) {
            // 更新已存在的结果
            this.processedResults[existingResultIndex] = {
              fileName: fileConfig.fileName,
              data: processedData,
              processedAt: new Date().toLocaleString(),
              showPreview: this.processedResults[existingResultIndex].showPreview || false
            };
          } else {
            // 添加新的处理结果
            this.processedResults.push({
              fileName: fileConfig.fileName,
              data: processedData,
              processedAt: new Date().toLocaleString(),
              showPreview: false
            });
          }

          processedCount++;
        } catch (error) {
          errors.push(`文件 ${fileConfig.fileName} 处理失败: ${error.message}`);
          errorCount++;
        }
      });

      // 显示处理结果
      if (errorCount > 0) {
        this.uploadMessage = `批量处理完成: 成功 ${processedCount} 个，失败 ${errorCount} 个。错误: ${errors.join('; ')}`;
        this.messageType = 'warning';
      } else if (processedCount > 0) {
        this.uploadMessage = `批量处理完成: 成功处理 ${processedCount} 个文件`;
        this.messageType = 'success';
      } else {
        this.uploadMessage = '没有可处理的文件';
        this.messageType = 'info';
      }
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

    // 切换Cut选择
    toggleCutSelection(fileConfig, cutTitle) {
      const index = fileConfig.selectedCuts.indexOf(cutTitle);
      if (index > -1) {
        fileConfig.selectedCuts.splice(index, 1);
      } else {
        fileConfig.selectedCuts.push(cutTitle);
      }
    },

    // 切换类型选择
    toggleTypeSelection(fileConfig, type) {
      const index = fileConfig.selectedTypes.indexOf(type);
      if (index > -1) {
        fileConfig.selectedTypes.splice(index, 1);
      } else {
        fileConfig.selectedTypes.push(type);
      }
    },

    // 下载处理后的文件
    downloadProcessedFile(result) {
      const jsonStr = JSON.stringify(result.data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = result.fileName.replace('.json', '-processed.json');
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      }, 100);
    },

    // 切换预览显示
    togglePreview(index) {
      if (this.processedResults[index]) {
        this.processedResults[index].showPreview = !this.processedResults[index].showPreview;
      }
    },

    // 获取JSON大小
    getJsonSize(data) {
      const jsonStr = JSON.stringify(data);
      const bytes = new Blob([jsonStr]).size;
      return this.formatFileSize(bytes);
    },

    // 获取总Layer数
    getTotalLayers(data) {
      let totalLayers = 0;
      if (data.cut && Array.isArray(data.cut)) {
        data.cut.forEach(cutItem => {
          if (cutItem.layers && Array.isArray(cutItem.layers)) {
            totalLayers += cutItem.layers.length;
          }
        });
      }
      return totalLayers;
    },

    // 提交单个文件配置到对应表格
    submitAllConfigs() {
      let addedCount = 0;
      let updatedCount = 0;
      let errorConfigs = [];

      this.fileConfigs.forEach((fileConfig, index) => {
        // 验证配置
        if (!fileConfig.name.trim()) {
          errorConfigs.push(`文件 ${index + 1}: 请填写名称`);
          return;
        }

        if (fileConfig.selectedCuts.length === 0) {
          errorConfigs.push(`文件 ${index + 1}: 请至少选择一个Cut项`);
          return;
        }

        // 确保该文件有对应的表格数据数组
        if (!this.fileTableData[fileConfig.fileName]) {
          // 在Vue 3中直接赋值即可触发响应式更新
          this.fileTableData = {
            ...this.fileTableData,
            [fileConfig.fileName]: []
          };
        }

        const currentFileTableData = this.fileTableData[fileConfig.fileName];

        // 为每个选中的裁片创建或更新配置
        fileConfig.selectedCuts.forEach(cutTitle => {
          // 检查当前文件表格中是否已存在相同裁片和名称的配置
          const existingIndex = currentFileTableData.findIndex(item =>
            item.selectedCuts.includes(cutTitle) &&
            item.name === fileConfig.name
          );

          // 创建表格项数据
          const tableItem = {
            selectedCuts: [cutTitle], // 每行只包含一个裁片
            name: fileConfig.name,
            customWidth: fileConfig.customWidth,
            customHeight: fileConfig.customHeight,
            sizeType: fileConfig.sizeType, // 保存尺寸类型
            selectedTypes: [...fileConfig.selectedTypes],
            position: fileConfig.position,
            size: fileConfig.size,
            x: fileConfig.x,
            y: fileConfig.y,
            isEditing: false,
            originalFileIndex: index,
            fileName: fileConfig.fileName
          };

          if (existingIndex >= 0) {
            // 更新已存在的配置
            currentFileTableData[existingIndex] = tableItem;
            updatedCount++;
          } else {
            // 添加新配置
            currentFileTableData.push(tableItem);
            addedCount++;
          }
        });
      });

      // 显示结果消息
      if (errorConfigs.length > 0) {
        this.uploadMessage = `部分配置有误：${errorConfigs.join('; ')}`;
        this.messageType = 'warning';
      } else if (addedCount > 0 || updatedCount > 0) {
        let message = '';
        if (addedCount > 0) message += `新增 ${addedCount} 个配置`;
        if (updatedCount > 0) {
          if (message) message += '，';
          message += `更新 ${updatedCount} 个配置`;
        }
        this.uploadMessage = `${message}到表格`;
        this.messageType = 'success';
      } else {
        this.uploadMessage = '没有可提交的配置';
        this.messageType = 'info';
      }
    },

    // 开始编辑
    startEdit(fileName, index) {
      if (this.fileTableData[fileName] && this.fileTableData[fileName][index]) {
        this.fileTableData[fileName][index].isEditing = true;
      }
    },

    // 完成编辑
    finishEdit(fileName, index) {
      if (this.fileTableData[fileName] && this.fileTableData[fileName][index]) {
        this.fileTableData[fileName][index].isEditing = false;
        this.uploadMessage = '编辑完成';
        this.messageType = 'success';
      }
    },

    // 删除表格项
    deleteItem(fileName, originalIndex) {
      if (confirm('确定要删除这项配置吗？')) {
        if (this.fileTableData[fileName]) {
          this.fileTableData[fileName].splice(originalIndex, 1);
          this.uploadMessage = '配置已删除';
          this.messageType = 'info';
        }
      }
    },

    // 获取类型选项
    getTypeOptions() {
      const list = []
      for (let i = 0; i < typeList.length; i++) {
        const item = typeList[i]
        let label = item.name
        for (let y = 0; y < item.list.length; y++) {
          const listItem = item.list[y]
          list.push({
            label: label + ' - ' + listItem.name,
            value: listItem.name
          })
        }
      }
      return list
    },

    // 获取位置选项
    getPositionOptions() {
      return [
        { label: '居左顶部位置对齐(left_top)', value: 'left_top' },
        { label: '居左垂直居中对齐(left_vertical)', value: 'left_vertical' },
        { label: '居左底部位置对齐(left_bottom)', value: 'left_bottom' },
        { label: '水平居中顶部位置对齐(middle_top)', value: 'middle_top' },
        { label: '水平居中垂直居中对齐(middle_vertical)', value: 'middle_vertical' },
        { label: '水平居中底部位置对齐(middle_bottom)', value: 'middle_bottom' },
        { label: '居右顶部位置对齐(right_top)', value: 'right_top' },
        { label: '居右垂直居中对齐(right_vertical)', value: 'right_vertical' },
        { label: '居右底部位置对齐(right_bottom)', value: 'right_bottom' }
      ];
    },

    // 获取大小选项
    getSizeOptions() {
      return [
        { label: '固定大小(set)', value: 'set' },
        { label: '等比缩放(scale)', value: 'scale' },
        { label: 'Logo waistband', value: 'waistband' },
        { label: '裤腰(waistband)', value: 'waistband' }
      ];
    },

    // 获取类型标签
    getTypeLabel(value) {
      const type = this.getTypeOptions().find(t => t.value === value);
      return type ? type.label : value;
    },

    // 获取位置标签
    getPositionLabel(value) {
      const position = this.getPositionOptions().find(p => p.value === value);
      return position ? position.label : value || '-';
    },

    // 获取大小标签
    getSizeLabel(value) {
      const size = this.getSizeOptions().find(s => s.value === value);
      return size ? size.label : value || '-';
    },

    // 处理单个文件的表格数据，计算合并行数
    getProcessedTableData(fileName) {
      const tableData = this.fileTableData[fileName] || [];
      if (!Array.isArray(tableData)) {
        return [];
      }
      const processed = [];
      const cutGroups = {};

      // 按裁片分组
      tableData.forEach((item, index) => {
        const cutName = item.selectedCuts[0] || '';
        if (!cutGroups[cutName]) {
          cutGroups[cutName] = [];
        }
        cutGroups[cutName].push({ ...item, originalIndex: index });
      });

      // 为每个分组的第一行添加rowspan信息
      Object.keys(cutGroups).forEach(cutName => {
        const group = cutGroups[cutName];
        group.forEach((item, index) => {
          processed.push({
            ...item,
            showCutCell: index === 0, // 只有第一行显示裁片单元格
            cutRowspan: index === 0 ? group.length : 0 // 第一行设置rowspan
          });
        });
      });

      return processed;
    },

    // 切换类型选择（用于表格中的多选下拉框）
    toggleTypeSelection(item, typeValue) {
      const index = item.selectedTypes.indexOf(typeValue);
      if (index > -1) {
        item.selectedTypes.splice(index, 1);
      } else {
        item.selectedTypes.push(typeValue);
      }
    },



    // 获取宽度显示文本
    getWidthDisplay(item) {
      if (item.sizeType === 'auto') {
        return '与cut宽高一致';
      } else if (item.customWidth !== null && item.customWidth !== undefined) {
        return item.customWidth;
      } else {
        return '0';
      }
    },

    // 获取高度显示文本
    getHeightDisplay(item) {
      if (item.sizeType === 'auto') {
        return '与cut宽高一致';
      } else if (item.customHeight !== null && item.customHeight !== undefined) {
        return item.customHeight;
      } else {
        return '0';
      }
    }
  }
}
</script>

<style scoped>
.json-uploader {
  max-width: 1400px;
  margin: 0 auto;
  padding: 30px;
  font-family: 'Microsoft YaHei', Arial, sans-serif;
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
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
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

/* 文件配置区域样式 */
.files-config-container {
  margin-top: 2rem;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
}

.files-config-container h3 {
  margin: 0 0 2rem 0;
  color: #2c3e50;
  text-align: center;
  font-size: 1.5rem;
  font-weight: 600;
}

.file-config-item {
  background-color: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e9ecef;
  transition: all 0.3s ease;
}

.file-config-item:hover {
  box-shadow: 0 6px 30px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.file-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #42b983 0%, #36a878 100%);
  border-radius: 8px;
  color: white;
}

.file-header h4 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.file-header .remove-btn {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
}

.file-header .remove-btn:hover {
  background-color: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.config-form {
  border-top: 2px solid #e9ecef;
  padding: 1.5rem;
  margin: 1rem 0;
}

/* 表单分区样式 */
.form-section {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e9ecef;
}

.form-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.form-group.full-width {
  width: 100%;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.form-row:last-child {
  margin-bottom: 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: #2c3e50;
  font-size: 0.95rem;
  margin-bottom: 0.5rem;
}

.form-input {
  padding: 0.875rem 1rem;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 500;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  color: #2c3e50;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.form-input::placeholder {
  color: #6c757d;
  font-weight: 400;
  opacity: 0.8;
}

.form-input:hover {
  border-color: #42b983;
  background: linear-gradient(135deg, #f8f9fa 0%, #f0f8f0 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(66, 185, 131, 0.1);
}

.form-input:focus {
  outline: none;
  border-color: #42b983;
  background: linear-gradient(135deg, #ffffff 0%, #f0f8f0 100%);
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.15), 0 4px 16px rgba(66, 185, 131, 0.1);
  transform: translateY(-1px);
}

.form-select {
  padding: 0.875rem 1rem;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 500;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  color: #2c3e50;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 1rem center;
  background-size: 1rem;
  padding-right: 3rem;
}

.form-select:hover {
  border-color: #42b983;
  background: linear-gradient(135deg, #f8f9fa 0%, #f0f8f0 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(66, 185, 131, 0.1);
}

.form-select:focus {
  outline: none;
  border-color: #42b983;
  background: linear-gradient(135deg, #ffffff 0%, #f0f8f0 100%);
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.15), 0 4px 16px rgba(66, 185, 131, 0.1);
  transform: translateY(-1px);
}

.form-select:focus option {
  background-color: white;
  color: #2c3e50;
}

.form-select option {
  padding: 0.75rem;
  background-color: white;
  color: #2c3e50;
  font-weight: 500;
}

.form-select option:hover {
  background-color: #f0f8f0;
}

.form-select option:checked {
  background-color: #42b983;
  color: white;
}

/* Cut选择容器 */
.cut-selection-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.cut-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border: 2px solid #e9ecef;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.9rem;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  position: relative;
  overflow: hidden;
}

.cut-option::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(66, 185, 131, 0.1) 0%, rgba(54, 168, 120, 0.1) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.cut-option:hover {
  border-color: #42b983;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 185, 131, 0.15);
}

.cut-option:hover::before {
  opacity: 1;
}

.cut-option.selected {
  background: linear-gradient(135deg, #42b983 0%, #36a878 100%);
  border-color: #36a878;
  color: white;
  box-shadow: 0 4px 16px rgba(66, 185, 131, 0.3);
  transform: translateY(-1px);
}

.cut-option.selected::before {
  opacity: 0;
}

.cut-checkbox {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.9);
  border: 2px solid #dee2e6;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
}

.cut-option.selected .cut-checkbox {
  background-color: white;
  border-color: white;
}

.check-icon {
  width: 14px;
  height: 14px;
  color: #42b983;
  fill: #42b983;
  opacity: 0;
  transform: scale(0.5);
  transition: all 0.2s ease;
  position: relative;
  z-index: 3;
}

.cut-option.selected .check-icon {
  opacity: 1;
  transform: scale(1);
  color: #42b983;
  fill: #42b983;
}

.cut-title {
  font-weight: 500;
  transition: color 0.3s ease;
  position: relative;
  z-index: 1;
}

.cut-option.selected .cut-title {
  color: white;
  font-weight: 600;
}

/* 类型选择容器 - 与Cut选择保持一致 */
.type-selection-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.type-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border: 2px solid #e9ecef;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.9rem;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  position: relative;
  overflow: hidden;
}

.type-option::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(66, 185, 131, 0.1) 0%, rgba(54, 168, 120, 0.1) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.type-option:hover {
  border-color: #42b983;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 185, 131, 0.15);
}

.type-option:hover::before {
  opacity: 1;
}

.type-option.selected {
  background: linear-gradient(135deg, #42b983 0%, #36a878 100%);
  border-color: #36a878;
  color: white;
  box-shadow: 0 4px 16px rgba(66, 185, 131, 0.3);
  transform: translateY(-1px);
}

.type-option.selected::before {
  opacity: 0;
}

.type-checkbox {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.9);
  border: 2px solid #dee2e6;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
}

.type-option.selected .type-checkbox {
  background-color: white;
  border-color: white;
}

.type-option .check-icon {
  width: 14px;
  height: 14px;
  color: #42b983;
  fill: #42b983;
  opacity: 0;
  transform: scale(0.5);
  transition: all 0.2s ease;
  position: relative;
  z-index: 3;
}

.type-option.selected .check-icon {
  opacity: 1;
  transform: scale(1);
  color: #42b983;
  fill: #42b983;
}

.type-title {
  font-weight: 500;
  transition: color 0.3s ease;
  position: relative;
  z-index: 1;
}

.type-option.selected .type-title {
  color: white;
  font-weight: 600;
}

.size-selector {
  margin: 0.5rem 0;
}

.size-options {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.size-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  background-color: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  font-weight: 500;
  flex: 1;
  justify-content: center;
}

.size-option:hover {
  border-color: #42b983;
  background-color: #f0f8f0;
  transform: translateY(-1px);
}

.size-option.selected {
  background-color: #42b983;
  border-color: #42b983;
  color: white;
  box-shadow: 0 2px 8px rgba(66, 185, 131, 0.3);
}

.size-option.selected .option-text {
  color: white;
  font-weight: 600;
}

.size-option input[type="radio"] {
  display: none;
}

.option-text {
  transition: color 0.3s ease;
}

.custom-size-panel {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border: 2px solid #e9ecef;
  border-radius: 12px;
  padding: 1.5rem;
  margin-top: 1rem;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
  animation: slideDown 0.3s ease;
}

.size-input-group {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.size-input {
  width: 120px;
  padding: 0.75rem 1rem;
  border: 2px solid #e9ecef;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 500;
  text-align: center;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  color: #2c3e50;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.size-input::placeholder {
  color: #6c757d;
  font-weight: 400;
  opacity: 0.8;
}

.size-input:hover {
  border-color: #42b983;
  background: linear-gradient(135deg, #f8f9fa 0%, #f0f8f0 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(66, 185, 131, 0.1);
}

.size-input:focus {
  outline: none;
  border-color: #42b983;
  background: linear-gradient(135deg, #ffffff 0%, #f0f8f0 100%);
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.15), 0 4px 16px rgba(66, 185, 131, 0.1);
  transform: translateY(-1px);
}

.dimension-separator {
  font-size: 1.2rem;
  color: #666;
  font-weight: 600;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.file-actions {
  display: flex;
  justify-content: center;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;
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

.clear-btn,
.process-btn,
.confirm-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.3s ease;
}

.form-confirm-btn {
  width: 100%;
  padding: 15px 20px;
  background: linear-gradient(135deg, #42b983 0%, #36a878 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 16px rgba(66, 185, 131, 0.3);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.form-confirm-btn:hover {
  background: linear-gradient(135deg, #36a878 0%, #2d8f5f 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(66, 185, 131, 0.4);
}

.form-confirm-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(66, 185, 131, 0.3);
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

/* 结果展示区域样式 */
.results-container {
  margin-top: 30px;
  background-color: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
}

.results-container h3 {
  margin: 0 0 20px 0;
  color: #333;
  text-align: center;
}

.result-item {
  background-color: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 25px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #f0f0f0;
}

.result-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.result-header h4 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.process-time {
  font-size: 12px;
  color: #666;
  background-color: #f0f0f0;
  padding: 4px 8px;
  border-radius: 12px;
  width: fit-content;
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

.preview-btn {
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.3s;
}

.preview-btn:hover {
  background-color: #45a049;
}

.preview-btn.active {
  background-color: #ff9800;
}

.preview-btn.active:hover {
  background-color: #f57c00;
}

.batch-actions {
  margin: 30px auto;
  text-align: center;
  max-width: 1400px;
}

.batch-process-btn {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  padding: 15px 30px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);
}

.batch-process-btn:hover {
  background: linear-gradient(135deg, #5b5dff 0%, #7c3aed 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
}

.batch-process-btn:active {
  transform: translateY(0);
}

.json-stats {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.json-stats span {
  background-color: #e3f2fd;
  color: #1976d2;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
}

.json-preview {
  background-color: #2d3748;
  border-radius: 8px;
  overflow: hidden;
}

.result-content {
  margin-top: 15px;
}

.json-preview {
  color: #e2e8f0;
  padding: 1.5rem;
  border-radius: 8px;
  overflow-x: auto;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  max-height: 400px;
  overflow-y: auto;
}

.json-preview pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
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
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

/* 表格样式 */
.tables-container {
  margin-top: 30px;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
}

.tables-container h3 {
  margin: 0 0 30px 0;
  color: #2c3e50;
  text-align: center;
  font-size: 1.6rem;
  font-weight: 600;
}

.file-table-section {
  margin-bottom: 40px;
}

.file-table-title {
  margin: 0 0 20px 0;
  color: #42b983;
  font-size: 1.2rem;
  font-weight: 600;
  padding: 10px 15px;
  background: linear-gradient(135deg, #f0f8f0 0%, #e8f5e8 100%);
  border-radius: 8px;
  border-left: 4px solid #42b983;
}

.table-container {
  background-color: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e9ecef;
}

.table-container h3 {
  margin: 0 0 30px 0;
  color: #2c3e50;
  text-align: center;
  font-size: 1.6rem;
  font-weight: 600;
}

.table-wrapper {
  overflow-x: auto;
  overflow-y: auto;
  max-height: 600px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  width: 100%;
  position: relative;
}

/* 自定义滚动条样式 */
.table-wrapper::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

.table-wrapper::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 6px;
}

.table-wrapper::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #42b983 0%, #36a878 100%);
  border-radius: 6px;
}

.table-wrapper::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #36a878 0%, #2d8f5f 100%);
}

.table-wrapper::-webkit-scrollbar-corner {
  background: #f1f1f1;
}

.config-table {
  width: auto;
  min-width: 1500px;
  border-collapse: collapse;
  background-color: white;
  font-size: 1rem;
  table-layout: fixed;
}

.config-table th,
.config-table td {
  border: 1px solid #e9ecef;
  padding: 16px 8px;
  text-align: center;
  vertical-align: middle;
  overflow: hidden;
  word-wrap: break-word;
}

.config-table th {
  background: linear-gradient(135deg, #42b983 0%, #36a878 100%);
  color: white;
  font-weight: 600;
  font-size: 0.95rem;
  position: sticky;
  top: 0;
  z-index: 10;
  white-space: nowrap;
}

.config-table td {
  background-color: white;
}

/* 精确控制每一列的宽度 - 设置固定宽度确保内容不被遮挡 */
.config-table colgroup col:nth-child(1) {
  width: 150px;
}

/* 裁片 */
.config-table colgroup col:nth-child(2) {
  width: 180px;
}

/* 名称 */
.config-table colgroup col:nth-child(3) {
  width: 120px;
}

/* 宽度 */
.config-table colgroup col:nth-child(4) {
  width: 120px;
}

/* 高度 */
.config-table colgroup col:nth-child(5) {
  width: 80px;
}

/* X */
.config-table colgroup col:nth-child(6) {
  width: 80px;
}

/* Y */
.config-table colgroup col:nth-child(7) {
  width: 300px;
}

/* 类型 */
.config-table colgroup col:nth-child(8) {
  width: 280px;
}

/* 位置 */
.config-table colgroup col:nth-child(9) {
  width: 160px;
}

/* 大小 */
.config-table colgroup col:nth-child(10) {
  width: 120px;
}

/* 操作 */

/* 固定操作列在右侧 - 更新选择器以适应合并单元格 */
.config-table th:last-child,
.config-table td:last-child {
  position: sticky;
  right: 0;
  background-color: white !important;
  z-index: 5;
  box-shadow: -2px 0 4px rgba(0, 0, 0, 0.1);
}

.config-table th:last-child {
  z-index: 15;
  background: linear-gradient(135deg, #42b983 0%, #36a878 100%) !important;
}

/* 确保偶数行的固定列也是白色背景 */
.table-row:nth-child(even) td:last-child {
  background-color: white !important;
}

/* 确保悬停时的固定列也是白色背景 */
.table-row:hover td:last-child {
  background-color: white !important;
}

.table-row:nth-child(even) {
  background-color: #f8f9fa;
}

.table-row:hover {
  background-color: #e8f5e8;
  transition: background-color 0.3s ease;
}

.cut-cell {
  text-align: center !important;
  vertical-align: middle !important;
  padding: 16px 8px !important;
}

.merged-cell {
  background-color: #f8f9fa !important;
  border-right: 2px solid #42b983 !important;
  font-weight: 600;
  position: relative;
}

.merged-cell::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(135deg, #42b983 0%, #36a878 100%);
}

.cut-list {
  font-size: 0.9rem;
  line-height: 1.5;
  color: #2c3e50;
  font-weight: 500;
  text-align: center;
  word-wrap: break-word;
}

.multi-line-cell {
  text-align: center !important;
  vertical-align: middle !important;
  padding: 16px 8px !important;
  overflow: visible !important;
  position: relative;
}

.type-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.type-tag {
  background-color: #42b983;
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.8rem;
  text-align: center;
  min-width: 50px;
  font-weight: 500;
}

/* 表格类型编辑容器 */
.table-type-selection {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
  padding: 8px;
}

/* 表格类型选项样式 */
.table-type-option {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border: 1px solid #e9ecef;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.75rem;
  font-weight: 500;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  position: relative;
  overflow: hidden;
}

.table-type-option::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(66, 185, 131, 0.1) 0%, rgba(54, 168, 120, 0.1) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.table-type-option:hover {
  border-color: #42b983;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(66, 185, 131, 0.15);
}

.table-type-option:hover::before {
  opacity: 1;
}

.table-type-option.selected {
  background: linear-gradient(135deg, #42b983 0%, #36a878 100%);
  border-color: #36a878;
  color: white;
  box-shadow: 0 2px 8px rgba(66, 185, 131, 0.3);
  transform: translateY(-1px);
}

.table-type-option.selected::before {
  opacity: 0;
}

.table-type-checkbox {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  background-color: rgba(255, 255, 255, 0.9);
  border: 1px solid #dee2e6;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
}

.table-type-option.selected .table-type-checkbox {
  background-color: white;
  border-color: white;
}

.table-type-option .check-icon {
  width: 8px;
  height: 8px;
  color: #42b983;
  fill: #42b983;
  opacity: 0;
  transform: scale(0.5);
  transition: all 0.2s ease;
  position: relative;
  z-index: 3;
}

.table-type-option.selected .check-icon {
  opacity: 1;
  transform: scale(1);
  color: #42b983;
  fill: #42b983;
}

.table-type-title {
  font-weight: 500;
  transition: color 0.3s ease;
  position: relative;
  z-index: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.table-type-option.selected .table-type-title {
  color: white;
  font-weight: 600;
}

/* 自定义滚动条 */
.table-type-selection::-webkit-scrollbar {
  width: 6px;
}

.table-type-selection::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.table-type-selection::-webkit-scrollbar-thumb {
  background: #42b983;
  border-radius: 3px;
}

.table-type-selection::-webkit-scrollbar-thumb:hover {
  background: #36a878;
}

.table-input {
  width: 100%;
  max-width: 100%;
  padding: 8px 10px;
  border: 2px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.9rem;
  text-align: center;
  background-color: white;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.table-input:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.1);
  background-color: #f8fff8;
}

.table-select {
  width: 100%;
  max-width: 100%;
  padding: 8px 10px;
  border: 2px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.9rem;
  background-color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.table-select:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.1);
  background-color: #f8fff8;
}

.action-cell {
  text-align: center !important;
  vertical-align: middle !important;
  padding: 16px 8px !important;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.action-btn {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 60px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.edit-btn {
  background-color: #007bff;
  color: white;
}

.edit-btn:hover {
  background-color: #0056b3;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 123, 255, 0.3);
}

.complete-btn {
  background-color: #28a745;
  color: white;
}

.complete-btn:hover {
  background-color: #1e7e34;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
}

.delete-btn {
  background-color: #dc3545;
  color: white;
}

.delete-btn:hover {
  background-color: #c82333;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(220, 53, 69, 0.3);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .json-uploader {
    padding: 1rem;
    margin: 0 0.5rem;
  }

  .files-config-container h3 {
    font-size: 1.3rem;
  }

  .file-config-item {
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .file-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
  }

  .file-header .remove-btn {
    align-self: flex-end;
  }

  .config-form {
    padding: 1rem;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .size-inputs {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .cut-selection-container {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .cut-option {
    padding: 0.75rem;
    font-size: 0.85rem;
  }

  .type-selection-container {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .type-option {
    font-size: 0.85rem;
    padding: 0.75rem;
  }

  .size-options {
    gap: 0.4rem;
    margin-bottom: 0.5rem;
  }

  .size-option {
    font-size: 0.85rem;
    padding: 0.5rem 0.8rem;
  }

  .custom-size-panel {
    padding: 0.8rem;
  }

  .size-input-group {
    gap: 0.5rem;
  }

  .size-input {
    width: 100px;
    font-size: 0.85rem;
    padding: 0.6rem 0.8rem;
  }

  .dimension-separator {
    font-size: 1rem;
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
}

@media (max-width: 480px) {
  .json-uploader {
    padding: 0.75rem;
    margin: 0 0.25rem;
  }

  .file-config-item {
    padding: 1rem;
    border-radius: 8px;
  }

  .file-header {
    padding: 0.75rem;
    border-radius: 6px;
  }

  .config-form {
    padding: 0.75rem;
  }

  .cut-selection-container {
    grid-template-columns: 1fr;
    gap: 0.4rem;
  }

  .cut-option {
    padding: 0.6rem;
    font-size: 0.8rem;
  }

  .type-selection-container {
    grid-template-columns: 1fr;
    gap: 0.4rem;
  }

  .type-option {
    justify-content: flex-start;
    width: 100%;
    font-size: 0.8rem;
    padding: 0.6rem 0.8rem;
  }

  .size-options {
    flex-direction: column;
    gap: 0.4rem;
  }

  .size-option {
    padding: 0.4rem 0.6rem;
    font-size: 0.8rem;
  }

  .custom-size-panel {
    padding: 0.6rem;
  }

  .size-input-group {
    gap: 0.4rem;
  }

  .size-input {
    width: 85px;
    padding: 0.5rem 0.6rem;
    font-size: 0.8rem;
  }
}
</style>