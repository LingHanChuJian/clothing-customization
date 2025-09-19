<template>
  <div class="t-shirt-sloper-generator">
    <h2>T恤印花生成Sloper JSON工具</h2>
    
    <!-- 基本信息 -->
    <div class="form-section">
      <h3 class="section-title">基本信息</h3>
      <div class="basic-info">
        <div class="input-group">
          <label for="patternName">版型名称：</label>
          <input 
            type="text" 
            id="patternName" 
            v-model="basicInfo.patternName" 
            placeholder="请输入版型名称"
            class="form-input"
          />
        </div>
        <div class="input-group">
          <label for="size">尺码：</label>
          <input 
            type="text" 
            id="size" 
            v-model="basicInfo.size" 
            placeholder="请输入尺码"
            class="form-input"
          />
        </div>
      </div>
    </div>

    <!-- 裁片信息 -->
    <div class="form-section">
      <h3 class="section-title">裁片信息</h3>
      <div class="cutting-pieces">
        <div 
          v-for="(piece, index) in cuttingPieces" 
          :key="piece.id" 
          class="cutting-piece-form"
        >
          <div class="piece-header">
            <h4 class="piece-title">裁片{{ index + 1 }}</h4>
            <button 
              v-if="cuttingPieces.length > 1"
              @click="removePiece(index)" 
              class="delete-btn"
              title="删除此裁片"
            >
              ×
            </button>
          </div>
          
          <div class="piece-inputs">
            <div class="input-group">
              <label :for="`pieceName${piece.id}`">裁片名称：</label>
              <input 
                type="text" 
                :id="`pieceName${piece.id}`"
                v-model="piece.name" 
                placeholder="请输入裁片名称"
                class="form-input"
              />
            </div>
            
            <div class="input-group">
              <label :for="`partName${piece.id}`">部位名称：</label>
              <input 
                type="text" 
                :id="`partName${piece.id}`"
                v-model="piece.partName" 
                placeholder="请输入部位名称"
                class="form-input"
              />
            </div>
            
            <div class="input-group">
              <label :for="`width${piece.id}`">宽：</label>
              <input 
                type="number" 
                :id="`width${piece.id}`"
                v-model.number="piece.width" 
                placeholder="请输入宽度"
                class="form-input"
                min="0"
                step="0.1"
              />
            </div>
            
            <div class="input-group">
              <label :for="`height${piece.id}`">高：</label>
              <input 
                type="number" 
                :id="`height${piece.id}`"
                v-model.number="piece.height" 
                placeholder="请输入高度"
                class="form-input"
                min="0"
                step="0.1"
              />
            </div>
          </div>
        </div>
      </div>
      
      <button @click="addPiece" class="add-piece-btn">
        + 添加裁片
      </button>
    </div>

    <!-- 操作按钮区域 -->
    <div class="actions-section">
      <div class="actions">
        <button @click="clearAll" class="clear-btn">清空所有</button>
        <button @click="generateSloperJson" class="generate-btn">生成 Sloper JSON</button>
      </div>
    </div>

    <!-- 结果展示区域 -->
    <div v-if="generatedJson" class="results-section">
      <h3>生成结果 ({{ generatedJson.cut.length }} 个裁片)</h3>
      
      <div class="result-item">
        <div class="result-header">
          <h4>{{ generatedJson.file_info.sloper_name }} - {{ generatedJson.file_info.size }}</h4>
          <div class="result-actions">
            <button class="download-btn download-zip-btn" @click="downloadZipPackage">
              下载压缩包
            </button>
            <button class="download-btn" @click="downloadAllImages">
              下载所有图片
            </button>
            <button class="download-btn" @click="downloadSloperJson">
              下载Sloper JSON
            </button>
          </div>
        </div>
        
        <!-- 裁片图片网格 -->
        <div class="children-images-section">
          <h5>裁片图片 ({{ generatedJson.cut.length }} 个)</h5>
          <div class="images-grid">
            <div 
              v-for="(piece, index) in generatedJson.cut" 
              :key="index"
              class="child-image-item"
            >
              <div class="image-container">
                <img 
                  :src="piece.url" 
                  :alt="`${piece.cut_name}`"
                  class="child-image"
                  @click="previewImage(piece.url, `${piece.cut_name}`)"
                />
                <div class="image-info">
                  <span class="image-type">{{ piece.cut_name }}</span>
                  <span class="image-size">{{ piece.size.width }} × {{ piece.size.height }}</span>
                  <button 
                    class="download-single-btn" 
                    @click="downloadSingleImage(piece.url, `${piece.cut_name}.png`)"
                  >
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
          <img :src="previewModal.url" :alt="previewModal.title" class="preview-image" />
        </div>
        <div class="preview-actions">
          <button class="download-btn" @click="downloadSingleImage(previewModal.url, `${previewModal.title}.png`)">
            下载图片
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default {
  name: 'TShirtSloperJson',
  data() {
    return {
      // 基本信息
      basicInfo: {
        patternName: '',
        size: ''
      },
      
      // 裁片信息
      cuttingPieces: [
        {
          id: 1,
          name: '',
          partName: '',
          width: null,
          height: null
        }
      ],
      
      // 生成的JSON结果
      generatedJson: null,
      
      // ID计数器
      nextId: 2,
      
      // 预览模态框
      previewModal: {
        show: false,
        url: '',
        title: ''
      }
    }
  },
  
  methods: {
    // 添加裁片
    addPiece() {
      this.cuttingPieces.push({
        id: this.nextId++,
        name: '',
        partName: '',
        width: null,
        height: null
      });
    },
    
    // 删除裁片
    removePiece(index) {
      if (this.cuttingPieces.length > 1) {
        this.cuttingPieces.splice(index, 1);
      }
    },
    
    // 清空所有
    clearAll() {
      this.basicInfo = {
        patternName: '',
        size: ''
      };
      this.cuttingPieces = [
        {
          id: 1,
          name: '',
          partName: '',
          width: null,
          height: null
        }
      ];
      this.generatedJson = null;
      this.nextId = 2;
    },
    
    // 生成Sloper JSON（暂时留空）
    generateSloperJson() {
      // 验证基本信息
      if (!this.basicInfo.patternName.trim()) {
        alert('请填写版型名称');
        return;
      }
      
      if (!this.basicInfo.size.trim()) {
        alert('请填写尺码');
        return;
      }
      
      // 验证裁片信息
      for (let i = 0; i < this.cuttingPieces.length; i++) {
        const piece = this.cuttingPieces[i];
        if (!piece.name.trim()) {
          alert(`请填写裁片${i + 1}的名称`);
          return;
        }
        if (!piece.partName.trim()) {
          alert(`请填写裁片${i + 1}的部位名称`);
          return;
        }
        if (piece.width === null || piece.width <= 0) {
          alert(`请填写裁片${i + 1}的有效宽度`);
          return;
        }
        if (piece.height === null || piece.height <= 0) {
          alert(`请填写裁片${i + 1}的有效高度`);
          return;
        }
      }
      
      // TODO: 实现实际的Sloper JSON生成逻辑
      console.log('生成Sloper JSON功能待实现');
      console.log('基本信息:', this.basicInfo);
      console.log('裁片信息:', this.cuttingPieces);
      
      // 生成裁片canvas图片
      const images = this.generateCanvasSloper();
      this.generatedJson = this.generateSloper(images);
    },
    generateSloper(images) {
        const sloperJson = {}

        sloperJson.file_info = {
            sloper_name: this.basicInfo.patternName,
            size: this.basicInfo.size,
            update_time: new Date().toISOString(),
            sloper_type: 0,
            width: 0,
            height: 0
        }

        sloperJson.cut = images.map(item => ({
            piece_name: item.name,
            cut_name: item.partName,
            size: {
                width: item.width,
                height: item.height
            },
            position: {
                x: 0,
                y: 0
            },
            rotation: 0,
            url: item.url,
            zoom: 1
        }))

        return sloperJson
    },
    /**
     * 生成裁片的canvas图片
     * @returns {Array} 返回包含裁片信息和图片URL的对象数组
     */
    generateCanvasSloper() {
      const images = [];
      
      this.cuttingPieces.forEach((piece, _) => {
        if (piece.width > 0 && piece.height > 0) {
          const canvas = this.createRoundedFramedCanvas(piece.width, piece.height, {
            border: 18,
            strokeStyle: '#000',      // 黑色边框
            fillStyle: null           // 透明背景
          });

          // 转换为图片URL
          const imageUrl = canvas.toDataURL('image/png');
          
          // 创建包含裁片信息和图片URL的对象
          const pieceWithImage = {
            id: piece.id,
            name: piece.name,
            partName: piece.partName,
            width: piece.width,
            height: piece.height,
            url: imageUrl
          };
          
          images.push(pieceWithImage);
        }
      });
      
      return images;
    },
    
    /**
     * 创建一个带圆角边框的 canvas
     * @param {number} w - 期望显示宽度（CSS 像素）
     * @param {number} h - 期望显示高度（CSS 像素）
     * @param {object} opts - 可选项
     * @returns {HTMLCanvasElement} canvas 元素
     */
    createRoundedFramedCanvas(w, h, opts = {}) {
      const border = typeof opts.border === 'number' ? opts.border : 18;
      const strokeStyle = opts.strokeStyle || '#000';
      const fillStyle = typeof opts.fillStyle === 'string' ? opts.fillStyle : null;
      const dpr = window.devicePixelRatio || 1;

      // CSS 显示尺寸
      const cssW = Math.max(1, Math.round(w));
      const cssH = Math.max(1, Math.round(h));

      // 创建 canvas 并设置用于高清显示的 pixel size
      const canvas = document.createElement('canvas');
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);

      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr); // 使用 CSS 像素坐标系，方便计算

      // 让 stroke 完全在内部：绘制 rect 的坐标要在 inset = border / 2 处
      const inset = border / 2;

      // 自动计算圆角（设置为很小的圆角）
      const defaultRadius = Math.min(cssW, cssH) / 100; // 进一步减小圆角，只要稍微有一点圆角即可
      let radius = typeof opts.radius === 'number' ? opts.radius : defaultRadius;

      // 确保 radius 合法
      const maxRadius = Math.min((cssW - 2 * inset) / 2, (cssH - 2 * inset) / 2);
      if (radius > maxRadius) radius = maxRadius;
      if (radius < 0) radius = 0;

      // 设置线段样式
      ctx.lineWidth = border;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = strokeStyle;

      // 背景填充
      if (fillStyle) {
        ctx.fillStyle = fillStyle;
        this.roundRectPath(ctx, inset, inset, cssW - inset * 2, cssH - inset * 2, radius);
        ctx.fill();
      }

      // 画边框
      this.roundRectPath(ctx, inset, inset, cssW - inset * 2, cssH - inset * 2, radius);
      ctx.stroke();

      return canvas;
    },
    
    /**
     * 在 ctx 上创建圆角矩形路径
     */
    roundRectPath(ctx, x, y, w, h, r) {
      // clamp r
      if (r < 0) r = 0;
      const maxR = Math.min(w, h) / 2;
      if (r > maxR) r = maxR;

      ctx.beginPath();
      // start at top-left corner + radius
      ctx.moveTo(x + r, y);
      // top edge
      ctx.lineTo(x + w - r, y);
      // top-right corner
      ctx.arcTo(x + w, y, x + w, y + r, r);
      // right edge
      ctx.lineTo(x + w, y + h - r);
      // bottom-right corner
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      // bottom edge
      ctx.lineTo(x + r, y + h);
      // bottom-left corner
      ctx.arcTo(x, y + h, x, y + h - r, r);
      // left edge
      ctx.lineTo(x, y + r);
      // top-left corner
      ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
    },
    
    /**
     * 在canvas上添加文字信息
     */
    addTextToCanvas(canvas, piece, w, h) {
      const ctx = canvas.getContext('2d');
      
      ctx.save();
      
      // 设置文字样式
      const fontSize = Math.min(w, h) / 8; // 根据canvas大小自适应字体大小
      ctx.font = `${fontSize}px Microsoft YaHei, Arial, sans-serif`;
      ctx.fillStyle = '#2c3e50';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // 计算文字位置
      const centerX = w / 2;
      const centerY = h / 2;
      
      // 绘制裁片名称（上方）
      ctx.fillText(piece.name, centerX, centerY - fontSize);
      
      // 绘制部位名称（中间）
      ctx.font = `${fontSize * 0.8}px Microsoft YaHei, Arial, sans-serif`;
      ctx.fillStyle = '#666';
      ctx.fillText(piece.partName, centerX, centerY);
      
      // 绘制尺寸信息（下方）
      ctx.font = `${fontSize * 0.6}px Microsoft YaHei, Arial, sans-serif`;
      ctx.fillStyle = '#999';
      ctx.fillText(`${piece.width} × ${piece.height}`, centerX, centerY + fontSize);
      
      ctx.restore();
    },
    
    // 图片预览
    previewImage(imageUrl, title) {
      this.previewModal = {
        show: true,
        url: imageUrl,
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

    // 下载所有图片
    downloadAllImages() {
      if (!this.generatedJson || !this.generatedJson.cut) return;
      
       this.generatedJson.cut.forEach((piece, index) => {
         if (piece.url) {
           setTimeout(() => {
             this.downloadSingleImage(
               piece.url, 
               `${piece.cut_name}.png`
             );
           }, index * 500); // 每张图片间隔500ms
         }
       });
    },

    // 下载Sloper JSON文件
    downloadSloperJson() {
      if (!this.generatedJson) return;
      
      const jsonStr = JSON.stringify(this.generatedJson, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${this.generatedJson.file_info.sloper_name}-${this.generatedJson.file_info.size}-sloper.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      }, 100);
    },

    // 下载压缩包
    async downloadZipPackage() {
      if (!this.generatedJson || !this.generatedJson.cut) return;
      
      try {
        const zip = new JSZip();
        const folderName = `${this.generatedJson.file_info.sloper_name}-${this.generatedJson.file_info.size}`;
        
        // 添加 Sloper JSON 文件
        const jsonStr = JSON.stringify(this.generatedJson, null, 2);
        zip.file(`${folderName}-sloper.json`, jsonStr);
        
        // 将图片 URL 转换为 Blob 的辅助函数
        const urlToBlob = async (url) => {
          const response = await fetch(url);
          return await response.blob();
        };
        
        // 添加裁片图片
         for (let i = 0; i < this.generatedJson.cut.length; i++) {
           try {
             const piece = this.generatedJson.cut[i];
             if (piece.url) {
               const imageBlob = await urlToBlob(piece.url);
               const fileName = `${piece.cut_name}.png`;
               zip.file(fileName, imageBlob);
             }
          } catch (error) {
            console.warn(`添加图片 ${i + 1} 失败:`, error);
          }
        }
        
        // 生成并下载压缩包
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipFileName = `${folderName}.zip`;
        saveAs(zipBlob, zipFileName);
        
      } catch (error) {
        console.error('生成压缩包失败:', error);
        alert('生成压缩包失败，请重试');
      }
    }
  }
}
</script>

<style scoped>
.t-shirt-sloper-generator {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

h2 {
  color: #2c3e50;
  text-align: center;
  margin-bottom: 2rem;
  font-size: 1.8rem;
  font-weight: bold;
}

.form-section {
  margin-bottom: 2.5rem;
  padding: 1.5rem;
  background-color: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.section-title {
  color: #2c3e50;
  margin: 0 0 1.5rem 0;
  font-size: 1.3rem;
  font-weight: 600;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #42b983;
}

.basic-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-group label {
  font-weight: 600;
  color: #495057;
  font-size: 0.95rem;
}

.form-input {
  padding: 0.75rem;
  border: 2px solid #dee2e6;
  border-radius: 4px;
  font-size: 0.95rem;
  transition: border-color 0.3s, box-shadow 0.3s;
  background-color: white;
}

.form-input:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.1);
}

.form-input::placeholder {
  color: #adb5bd;
}

.cutting-pieces {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.cutting-piece-form {
  background-color: white;
  border: 2px solid #dee2e6;
  border-radius: 6px;
  padding: 1.5rem;
  transition: border-color 0.3s;
}

.cutting-piece-form:hover {
  border-color: #42b983;
}

.piece-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e9ecef;
}

.piece-title {
  color: #2c3e50;
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.delete-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  cursor: pointer;
  font-size: 1.2rem;
  line-height: 1;
  transition: background-color 0.3s, transform 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-btn:hover {
  background-color: #c82333;
  transform: scale(1.1);
}

.piece-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.add-piece-btn {
  background-color: #42b983;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s, transform 0.2s;
  margin-top: 1rem;
  align-self: flex-start;
  width: 100%;
}

.add-piece-btn:hover {
  background-color: #36a878;
  transform: translateY(-1px);
}

.actions-section {
  margin-top: 2rem;
  padding: 1.5rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.actions {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
}

.clear-btn {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 4px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s, transform 0.2s;
}

.clear-btn:hover {
  background-color: #5a6268;
  transform: translateY(-2px);
}

.generate-btn {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 4px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s, transform 0.2s;
}

.generate-btn:hover {
  background-color: #0056b3;
  transform: translateY(-2px);
}

/* 结果展示区域样式 */
.results-section {
  margin-top: 2rem;
  padding: 1.5rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.results-section h3 {
  margin: 0 0 20px 0;
  color: #333;
  text-align: center;
}

.result-item {
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 0;
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

.part-name {
  background-color: #f3e5f5;
  color: #7b1fa2;
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
  .t-shirt-sloper-generator {
    padding: 1rem;
    margin: 0 1rem;
  }
  
  .basic-info {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .piece-inputs {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .actions {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  
  .clear-btn,
  .generate-btn {
    width: 100%;
    max-width: none;
  }
  
  .images-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 10px;
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
  
  .child-image {
    max-height: 120px;
  }
}

@media (max-width: 480px) {
  .piece-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .delete-btn {
    align-self: flex-end;
  }
}
</style>
