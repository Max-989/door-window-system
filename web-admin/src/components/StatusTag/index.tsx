import { Tag } from 'antd'
import { STATUS_LABELS, STATUS_COLORS } from '../../types/api'

interface StatusTagProps {
  status: string
  type?: 'order' | 'task' | 'personnel' | 'warehouse'
}

const StatusTag: React.FC<StatusTagProps> = ({ status }) => {
  const label = STATUS_LABELS[status] || status
  const color = STATUS_COLORS[status] || 'default'
  return <Tag color={color}>{label}</Tag>
}

export default StatusTag
