#!/usr/bin/env python3
import json
import sys
from pathlib import Path

def extract_table_schemas(file_path):
    """从解析的.base文件中提取表结构"""
    print("正在提取表结构...")

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 分析每个元素
    table_schemas = {}

    for element_idx, element in enumerate(data):
        if isinstance(element, dict) and 'schema' in element:
            schema = element['schema']

            # 查找tableMap
            if 'tableMap' in schema:
                table_map = schema['tableMap']
                print(f"\n=== 元素 {element_idx}: 发现 {len(table_map)} 个表 ===")

                for table_id, table_info in table_map.items():
                    if isinstance(table_info, dict):
                        # 提取表基本信息
                        table_name = table_info.get('name', f'表_{table_id}')
                        print(f"\n表: {table_name} (ID: {table_id})")

                        # 提取字段信息
                        if 'fieldMap' in table_info:
                            field_map = table_info['fieldMap']
                            print(f"  字段数: {len(field_map)}")

                            fields = []
                            for field_id, field_info in field_map.items():
                                if isinstance(field_info, dict):
                                    field_name = field_info.get('name', f'字段_{field_id}')
                                    field_type = field_info.get('type', '未知')
                                    field_desc = field_info.get('description', '')

                                    fields.append({
                                        'id': field_id,
                                        'name': field_name,
                                        'type': field_type,
                                        'description': field_desc
                                    })

                                    print(f"    - {field_name}: {field_type} {field_desc}")

                            # 保存表结构
                            table_schemas[table_name] = {
                                'id': table_id,
                                'name': table_name,
                                'field_count': len(field_map),
                                'fields': fields
                            }

                        # 检查视图信息
                        if 'views' in table_info:
                            views = table_info['views']
                            print(f"  视图数: {len(views)}")

                        # 检查其他信息
                        for key in ['fieldGroups', 'rankInfo', 'viewMap']:
                            if key in table_info:
                                val = table_info[key]
                                if isinstance(val, dict):
                                    print(f"  {key}: {len(val)} 项")
                                elif isinstance(val, list):
                                    print(f"  {key}: {len(val)} 个元素")

    return table_schemas

def generate_sql_schema(table_schemas):
    """生成SQL建表语句"""
    print("\n=== SQL建表语句 ===")

    sql_statements = []

    for table_name, schema in table_schemas.items():
        # 简化表名（移除特殊字符）
        sql_table_name = table_name.replace(' ', '_').replace('-', '_').replace('/', '_')
        sql_table_name = ''.join(c for c in sql_table_name if c.isalnum() or c == '_')

        # 创建表语句
        sql = f"CREATE TABLE `{sql_table_name}` (\n"
        sql += "  `id` INT PRIMARY KEY AUTO_INCREMENT,\n"

        # 添加字段
        for field in schema['fields']:
            field_name = field['name'].replace(' ', '_').replace('-', '_').replace('/', '_')
            field_name = ''.join(c for c in field_name if c.isalnum() or c == '_')

            # 映射字段类型
            field_type = field['type']
            sql_type = map_field_type(field_type)

            sql += f"  `{field_name}` {sql_type} COMMENT '{field['description']}',\n"

        sql += "  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n"
        sql += "  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP\n"
        sql += ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;"

        sql_statements.append(sql)
        print(f"\n-- 表: {table_name}")
        print(sql)

    return sql_statements

def map_field_type(base_type):
    """映射.base字段类型到SQL类型"""
    type_mapping = {
        'text': 'VARCHAR(255)',
        'number': 'DECIMAL(10,2)',
        'date': 'DATE',
        'datetime': 'DATETIME',
        'bool': 'BOOLEAN',
        'singleSelect': 'VARCHAR(100)',
        'multiSelect': 'TEXT',
        'attachment': 'TEXT',  # 存储文件路径
        'url': 'VARCHAR(500)',
        'phone': 'VARCHAR(20)',
        'email': 'VARCHAR(100)',
        'rating': 'TINYINT',
        'percent': 'DECIMAL(5,2)',
        'currency': 'DECIMAL(10,2)',
        'formula': 'TEXT',
        'lookup': 'TEXT',
        'rollup': 'TEXT',
        'count': 'INT',
        'autoNumber': 'INT',
        'createdTime': 'DATETIME',
        'lastModifiedTime': 'DATETIME',
        'createdBy': 'VARCHAR(100)',
        'lastModifiedBy': 'VARCHAR(100)',
        'button': 'VARCHAR(50)',
        'barcode': 'VARCHAR(100)',
        'link': 'VARCHAR(500)',
    }

    return type_mapping.get(base_type, 'TEXT')

def generate_typeorm_entities(table_schemas):
    """生成TypeORM实体定义"""
    print("\n=== TypeORM实体定义 ===")

    entities = []

    for table_name, schema in table_schemas.items():
        # 简化表名和类名
        class_name = ''.join(word.capitalize() for word in table_name.replace('-', ' ').replace('_', ' ').split())
        class_name = class_name.replace(' ', '')

        entity_code = f"import {{ Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn }} from 'typeorm';\n\n"
        entity_code += f"@Entity('{table_name.replace(' ', '_').lower()}')\n"
        entity_code += f"export class {class_name} {{\n"
        entity_code += "  @PrimaryGeneratedColumn()\n"
        entity_code += "  id: number;\n\n"

        # 添加字段
        for field in schema['fields']:
            field_name = field['name'].replace(' ', '_').replace('-', '_').replace('/', '_').lower()
            field_name = ''.join(c for c in field_name if c.isalnum() or c == '_')

            # 映射TypeScript类型
            ts_type = map_to_typescript_type(field['type'])

            entity_code += f"  @Column({{ name: '{field['name']}', nullable: true }})\n"
            entity_code += f"  {field_name}: {ts_type};\n\n"

        entity_code += "  @CreateDateColumn({ name: 'created_at' })\n"
        entity_code += "  createdAt: Date;\n\n"
        entity_code += "  @UpdateDateColumn({ name: 'updated_at' })\n"
        entity_code += "  updatedAt: Date;\n"
        entity_code += "}\n"

        entities.append({
            'class_name': class_name,
            'table_name': table_name,
            'code': entity_code
        })

        print(f"\n// 实体: {class_name} (对应表: {table_name})")
        print(entity_code[:500] + "..." if len(entity_code) > 500 else entity_code)

    return entities

def map_to_typescript_type(base_type):
    """映射到TypeScript类型"""
    ts_mapping = {
        'text': 'string',
        'number': 'number',
        'date': 'Date',
        'datetime': 'Date',
        'bool': 'boolean',
        'singleSelect': 'string',
        'multiSelect': 'string[]',
        'attachment': 'string[]',
        'url': 'string',
        'phone': 'string',
        'email': 'string',
        'rating': 'number',
        'percent': 'number',
        'currency': 'number',
        'formula': 'string',
        'lookup': 'any',
        'rollup': 'any',
        'count': 'number',
        'autoNumber': 'number',
        'createdTime': 'Date',
        'lastModifiedTime': 'Date',
        'createdBy': 'string',
        'lastModifiedBy': 'string',
        'button': 'string',
        'barcode': 'string',
        'link': 'string',
    }

    return ts_mapping.get(base_type, 'any')

def main():
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    else:
        file_path = "../02-数据文件/解析数据/柯尚订单管理.base.parsed.json"

    if not Path(file_path).exists():
        print(f"文件不存在: {file_path}")
        sys.exit(1)

    print("=== .base文件表结构分析 ===")
    table_schemas = extract_table_schemas(file_path)

    print(f"\n=== 分析总结 ===")
    print(f"共发现 {len(table_schemas)} 个表:")
    for table_name, schema in table_schemas.items():
        print(f"  - {table_name}: {schema['field_count']} 个字段")

    # 生成SQL语句
    sql_statements = generate_sql_schema(table_schemas)

    # 生成TypeORM实体
    typeorm_entities = generate_typeorm_entities(table_schemas)

    # 保存结果
    output = {
        'tables': table_schemas,
        'sql_schema': sql_statements,
        'typeorm_entities': typeorm_entities
    }

    output_file = "../02-数据文件/分析结果/表结构分析.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n分析结果已保存到: {output_file}")

if __name__ == "__main__":
    main()