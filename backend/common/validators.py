"""
通用校验器
"""
from django.core.validators import RegexValidator

# 中国大陆手机号校验器（11位，1开头，第二位3-9）
phone_validator = RegexValidator(
    regex=r"^1[3-9]\d{9}$", message="请输入正确的11位手机号", code="invalid_phone"
)

# 电话号码校验器（手机号或座机，座机格式：区号-号码）
phone_or_landline_validator = RegexValidator(
    regex=r"^(1[3-9]\d{9}|0\d{2,3}-?\d{7,8})$",
    message="请输入正确的电话号码",
    code="invalid_phone_or_landline",
)
