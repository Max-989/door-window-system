import { useState } from 'react'
import { Tabs } from 'antd'
import { CompressOutlined, ToolOutlined, AlertOutlined } from '@ant-design/icons'
import MeasurementList from './MeasurementList'
import InstallationList from './InstallationList'
import MaintenanceList from './MaintenanceList'

const TaskManagement = () => {
  const [activeTab, setActiveTab] = useState('measurement')

  const tabItems = [
    {
      key: 'measurement',
      label: (
        <span>
          <CompressOutlined style={{ marginRight: 6 }} />
          量尺
        </span>
      ),
      children: <div style={{ padding: '16px 0 0' }}><MeasurementList /></div>,
    },
    {
      key: 'installation',
      label: (
        <span>
          <ToolOutlined style={{ marginRight: 6 }} />
          安装
        </span>
      ),
      children: <div style={{ padding: '16px 0 0' }}><InstallationList /></div>,
    },
    {
      key: 'maintenance',
      label: (
        <span>
          <AlertOutlined style={{ marginRight: 6 }} />
          维修
        </span>
      ),
      children: <div style={{ padding: '16px 0 0' }}><MaintenanceList /></div>,
    },
  ]

  return (
    <div>
      <div className="page-header">
        <h2>服务管理</h2>
        <p>统一管理量尺、安装与维修任务</p>
      </div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ marginTop: 8 }}
        tabBarStyle={{
          marginBottom: 0,
          borderBottom: '1px solid #f0f0f0',
        }}
      />
    </div>
  )
}

export default TaskManagement
