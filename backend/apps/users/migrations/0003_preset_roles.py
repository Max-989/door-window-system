# -*- coding: utf-8 -*-

from django.db import migrations


def create_preset_roles(apps, schema_editor):
    Role = apps.get_model('users', 'Role')
    preset_roles = [
        {
            'name': '系统管理员',
            'code': 'system_admin',
            'description': '系统最高权限，管理所有模块',
            'permissions': {
                'orders': {'view': True, 'create': True, 'edit': True, 'delete': True},
                'products': {'view': True, 'create': True, 'edit': True, 'delete': True},
                'warehouse': {'view': True, 'create': True, 'edit': True, 'delete': True},
                'decoration': {'view': True, 'create': True, 'edit': True, 'delete': True},
                'users': {'view': True, 'create': True, 'edit': True, 'delete': True},
                'statistics': {'view': True},
            },
            'is_system': True,
        },
        {
            'name': '文员',
            'code': 'clerk',
            'description': '订单录入与管理',
            'permissions': {
                'orders': {'view': True, 'create': True, 'edit': True, 'delete': False},
                'products': {'view': True, 'create': False, 'edit': False, 'delete': False},
                'warehouse': {'view': True, 'create': False, 'edit': False, 'delete': False},
                'decoration': {'view': True, 'create': False, 'edit': False, 'delete': False},
                'users': {'view': False, 'create': False, 'edit': False, 'delete': False},
                'statistics': {'view': False},
            },
            'is_system': True,
        },
        {
            'name': '仓库人员',
            'code': 'warehouse',
            'description': '仓库产品管理与发货',
            'permissions': {
                'orders': {'view': True, 'create': False, 'edit': False, 'delete': False},
                'products': {'view': True, 'create': False, 'edit': False, 'delete': False},
                'warehouse': {'view': True, 'create': True, 'edit': True, 'delete': False},
                'decoration': {'view': False, 'create': False, 'edit': False, 'delete': False},
                'users': {'view': False, 'create': False, 'edit': False, 'delete': False},
                'statistics': {'view': True},
            },
            'is_system': True,
        },
        {
            'name': '项目经理',
            'code': 'project_manager',
            'description': '装企项目管理',
            'permissions': {
                'orders': {'view': True, 'create': True, 'edit': True, 'delete': False},
                'products': {'view': True, 'create': False, 'edit': False, 'delete': False},
                'warehouse': {'view': True, 'create': False, 'edit': False, 'delete': False},
                'decoration': {'view': True, 'create': True, 'edit': True, 'delete': False},
                'users': {'view': False, 'create': False, 'edit': False, 'delete': False},
                'statistics': {'view': True},
            },
            'is_system': True,
        },
        {
            'name': '导购',
            'code': 'sales_guide',
            'description': '门店销售与订单创建',
            'permissions': {
                'orders': {'view': True, 'create': True, 'edit': False, 'delete': False},
                'products': {'view': True, 'create': False, 'edit': False, 'delete': False},
                'warehouse': {'view': False, 'create': False, 'edit': False, 'delete': False},
                'decoration': {'view': False, 'create': False, 'edit': False, 'delete': False},
                'users': {'view': False, 'create': False, 'edit': False, 'delete': False},
                'statistics': {'view': False},
            },
            'is_system': True,
        },
    ]
    for role_data in preset_roles:
        Role.objects.get_or_create(
            code=role_data['code'],
            defaults={
                'name': role_data['name'],
                'description': role_data['description'],
                'permissions': role_data['permissions'],
                'is_system': role_data['is_system'],
            },
        )


def reverse_preset_roles(apps, schema_editor):
    Role = apps.get_model('users', 'Role')
    Role.objects.filter(code__in=['system_admin', 'clerk', 'warehouse', 'project_manager', 'sales_guide'], is_system=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_alter_user_role'),
    ]

    operations = [
        migrations.RunPython(create_preset_roles, reverse_preset_roles),
    ]
