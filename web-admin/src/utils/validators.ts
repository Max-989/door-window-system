/**
 * 通用表单校验规则
 */

// 中国大陆手机号正则（11位，1开头，第二位3-9）
export const PHONE_REGEX = /^1[3-9]\d{9}$/;

// 电话号码正则（手机号或座机，座机格式：区号-号码）
export const PHONE_OR_LANDLINE_REGEX = /^(1[3-9]\d{9}|0\d{2,3}-?\d{7,8})$/;

/**
 * 校验手机号（严格11位）
 */
export const validatePhone = (value: string): Promise<void> => {
  if (!value) return Promise.resolve();
  if (!PHONE_REGEX.test(value)) return Promise.reject('请输入正确的11位手机号');
  return Promise.resolve();
};

/**
 * 校验电话号码（手机号或座机）
 */
export const validatePhoneOrLandline = (value: string): Promise<void> => {
  if (!value) return Promise.resolve();
  if (!PHONE_OR_LANDLINE_REGEX.test(value)) return Promise.reject('请输入正确的电话号码');
  return Promise.resolve();
};

/**
 * Ant Design Form 校验规则
 */
export const phoneRules = [
  { required: false },
  { validator: (_: any, value: string) => validatePhone(value) },
];

export const phoneOrLandlineRules = [
  { required: false },
  { validator: (_: any, value: string) => validatePhoneOrLandline(value) },
];
