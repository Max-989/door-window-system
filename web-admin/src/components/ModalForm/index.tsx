import { Modal, Form, Input, Select, InputNumber, Switch, DatePicker } from 'antd'
import { useEffect } from 'react'

export interface FormField {
  name: string
  label: string
  type: 'input' | 'number' | 'select' | 'textarea' | 'switch' | 'date' | 'password'
  placeholder?: string
  rules?: any[]
  options?: { value: any; label: string }[]
  disabled?: boolean
  props?: Record<string, any>
}

interface ModalFormProps {
  title: string
  visible: boolean
  onCancel: () => void
  onOk: (values: any) => void
  fields: FormField[]
  initialValues?: Record<string, any>
  confirmLoading?: boolean
  width?: number
  /** 自定义字段渲染，传入 fieldName 返回 ReactNode 或 null */
  customFieldRender?: (fieldName: string) => React.ReactNode | null
  /** 表单值变化回调 */
  onValuesChange?: (changedValues: any, allValues: any) => void
}

const ModalForm: React.FC<ModalFormProps> = ({
  title, visible, onCancel, onOk, fields, initialValues, confirmLoading, width = 640, customFieldRender, onValuesChange,
}) => {
  const [form] = Form.useForm()

  useEffect(() => {
    if (visible) {
      form.resetFields()
      if (initialValues) form.setFieldsValue(initialValues)
    }
  }, [visible, initialValues, form])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      onOk(values)
    } catch { /* 校验失败 */ }
  }

  const renderField = (field: FormField) => {
    switch (field.type) {
      case 'textarea':
        return <Input.TextArea rows={3} placeholder={field.placeholder} {...field.props} />
      case 'number':
        return <InputNumber style={{ width: '100%' }} placeholder={field.placeholder} {...field.props} />
      case 'select':
        return <Select showSearch filterOption={(input, option) => (option?.label as string ?? '').includes(input)} placeholder={field.placeholder} options={field.options} allowClear {...field.props} />
      case 'switch':
        return <Switch {...field.props} />
      case 'date':
        return <DatePicker style={{ width: '100%' }} {...field.props} />
      case 'password':
        return <Input.Password placeholder={field.placeholder} {...field.props} />
      default:
        return <Input placeholder={field.placeholder} disabled={field.disabled} {...field.props} />
    }
  }

  return (
    <Modal
      title={title}
      open={visible}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={confirmLoading}
      width={width}
      destroyOnClose
      okText="确定"
      cancelText="取消"
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }} onValuesChange={onValuesChange}>
        {fields.map(field => (
          <Form.Item key={field.name} name={field.name} label={field.label} rules={field.rules} valuePropName={field.type === 'switch' ? 'checked' : 'value'}>
            {customFieldRender?.(field.name) || renderField(field)}
          </Form.Item>
        ))}
      </Form>
    </Modal>
  )
}

export default ModalForm
