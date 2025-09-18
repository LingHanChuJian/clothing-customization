<script setup>
// 不再直接导入组件
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <h1 class="app-title">数据处理工具</h1>
    </header>
    
    <main class="app-content">
      <div class="tool-buttons">
        <router-link to="/dxf-sloper-json" class="tool-button">DXF转Sloper JSON工具</router-link>
        <router-link to="/changing-parameters" class="tool-button">Sloper JSON 参数(Zoom)修改</router-link>
        <router-link to="/t-shirt-sloper-json" class="tool-button">T恤印花生成Sloper JSON工具</router-link>
      </div>
      <router-view />
    </main>
  </div>
</template>

<style>
body {
  margin: 0;
  padding: 0;
  font-family: 'Microsoft YaHei', Arial, sans-serif;
  background-color: #f5f5f5;
}

.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  background-color: #2c3e50;
  color: white;
  padding: 1rem 0;
  text-align: center;
}

.app-title {
  margin: 0;
  font-size: 1.8rem;
}

.app-content {
  flex: 1;
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.tool-buttons {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 2rem;
}

.tool-button {
  display: inline-block;
  padding: 15px 30px;
  background-color: #42b983;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-weight: bold;
  transition: background-color 0.3s;
  text-align: center;
}

.tool-button:hover {
  background-color: #36a878;
}

.tool-button.router-link-active {
  background-color: #2c805c;
}

.app-footer {
  background-color: #2c3e50;
  color: white;
  text-align: center;
  padding: 0.8rem;
  margin-top: auto;
  font-size: 0.9rem;
}
</style>
