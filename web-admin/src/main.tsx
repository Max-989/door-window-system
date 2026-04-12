import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App'
import './index.css'

const theme = {
  token: {
    colorPrimary: '#007AFF',
    colorSuccess: '#34C759',
    colorWarning: '#FF9500',
    colorError: '#FF3B30',
    colorInfo: '#007AFF',
    colorBgContainer: '#FFFFFF',
    colorBgLayout: '#F5F5F7',
    colorText: '#1D1D1F',
    colorTextSecondary: '#86868B',
    colorBorder: '#E5E5EA',
    borderRadius: 8,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', sans-serif",
    controlHeight: 44,
    fontSize: 14,
  },
  components: {
    Button: {
      primaryShadow: 'none',
      borderRadius: 8,
      controlHeight: 44,
      fontWeight: 500,
    },
    Input: {
      borderRadius: 8,
      controlHeight: 44,
      colorBorder: '#E5E5EA',
    },
    Card: {
      borderRadiusLG: 12,
      boxShadowTertiary: '0 1px 3px rgba(0,0,0,0.08)',
    },
    Table: {
      borderRadius: 8,
      headerBg: '#F5F5F7',
      headerColor: '#86868B',
      headerSortActiveBg: '#EBEBED',
      borderColor: '#E5E5EA',
      rowHoverBg: 'rgba(0,122,255,0.03)',
    },
    Modal: {
      borderRadiusLG: 12,
      boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    },
    Tabs: {
      inkBarColor: '#007AFF',
      itemColor: '#86868B',
      itemActiveColor: '#007AFF',
      itemSelectedColor: '#007AFF',
    },
    Tag: {
      borderRadiusSM: 4,
    },
    Select: {
      borderRadius: 8,
      controlHeight: 44,
      colorBorder: '#E5E5EA',
    },
  },
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider theme={theme} locale={zhCN}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>
)
