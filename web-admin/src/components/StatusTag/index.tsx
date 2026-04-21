import { Tag } from 'antd'
import { STATUS_LABELS, STATUS_COLORS } from '../../types/api'

interface StatusTagProps {
  status: string
  type?: 'order' | 'task' | 'personnel' | 'warehouse'
}

const ORDER_STATUS_VALUES = ['pending', 'confirmed', 'produced', 'shipped', 'arrived', 'delivered', 'installing', 'completed', 'cancelled', 'closed']
const TASK_STATUS_VALUES = ['pending', 'assigned', 'completed', 'cancelled', 'partial', 'in_progress']

const StatusTag: React.FC<StatusTagProps> = ({ status, type }) => {
  // Determine mapping key based on type and status
  let mappingKey = status
  if (type === 'order' && status === 'pending') {
    mappingKey = 'pending_confirm'
  } else if (type === 'task' && status === 'pending') {
    mappingKey = 'pending_assign'
  } else if (!type) {
    // Infer type from status value
    if (ORDER_STATUS_VALUES.includes(status) && status === 'pending') {
      // pending could be order or task, default to order pending (待确认)
      mappingKey = 'pending_confirm'
    } else if (TASK_STATUS_VALUES.includes(status) && status === 'pending') {
      mappingKey = 'pending_assign'
    }
    // For other statuses, mappingKey equals status (which may have direct mapping)
  }

  const label = STATUS_LABELS[mappingKey] || status
  const color = STATUS_COLORS[mappingKey] || 'default'
  return <Tag color={color}>{label}</Tag>
}

export default StatusTag
