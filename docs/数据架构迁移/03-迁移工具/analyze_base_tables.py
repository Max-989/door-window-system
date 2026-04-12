#!/usr/bin/env python3
import json
import sys
from pathlib import Path

def analyze_base_file(file_path):
    """分析.base文件中的表结构"""
    print(f"正在分析文件: {file_path}")

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"JSON包含 {len(data)} 个元素")

    # 分析每个元素
    for i, element in enumerate(data):
        print(f"\n=== 元素 {i} ===")

        if isinstance(element, dict):
            # 检查是否有schema
            if 'schema' in element:
                schema = element['schema']
                print(f"找到 schema")

                # 分析schema
                analyze_schema(schema)

            # 检查是否有data或其他结构
            for key in element:
                if key != 'schema':
                    value = element[key]
                    print(f"其他键: {key}, 类型: {type(value).__name__}")
                    if isinstance(value, (dict, list)):
                        print(f"    大小: {len(value) if hasattr(value, '__len__') else 'N/A'}")

def analyze_schema(schema):
    """分析schema结构"""
    if isinstance(schema, dict):
        # 基本信息
        if 'base' in schema:
            base = schema['base']
            print(f"基础信息:")
            for key in ['name', 'id', 'rev', 'schemaVersion']:
                if key in base:
                    print(f"  {key}: {base[key]}")

        # 块信息 (可能是表)
        if 'blockInfos' in schema:
            block_infos = schema['blockInfos']
            print(f"块信息 (可能的数据表): {len(block_infos)} 个")

            for block_id, block_info in block_infos.items():
                if isinstance(block_info, dict):
                    name = block_info.get('name', '未知')
                    block_type = block_info.get('blockType', '未知')
                    print(f"  - {name} (ID: {block_id}, 类型: {block_type})")

        # 检查是否有表定义
        if 'tableSchemas' in schema:
            table_schemas = schema['tableSchemas']
            print(f"表定义: {len(table_schemas)} 个表")

            for table_id, table_schema in table_schemas.items():
                print(f"\n  表: {table_schema.get('name', '未知')} (ID: {table_id})")

                # 字段信息
                if 'fields' in table_schema:
                    fields = table_schema['fields']
                    print(f"    字段数: {len(fields)}")

                    for field_id, field_info in fields.items():
                        if isinstance(field_info, dict):
                            field_name = field_info.get('name', '未知')
                            field_type = field_info.get('type', '未知')
                            print(f"      - {field_name}: {field_type}")

        # 尝试查找其他可能包含表结构的地方
        find_table_structures(schema)

def find_table_structures(obj, path="", depth=0, max_depth=3):
    """递归查找表结构"""
    if depth > max_depth:
        return

    if isinstance(obj, dict):
        # 检查是否有表相关结构
        table_keywords = ['table', 'field', 'column', 'schema', 'view']

        for key, value in obj.items():
            current_path = f"{path}.{key}" if path else key

            # 如果键名包含表相关关键词
            key_lower = str(key).lower()
            if any(keyword in key_lower for keyword in table_keywords):
                if isinstance(value, (dict, list)):
                    size = len(value) if hasattr(value, '__len__') else 'N/A'
                    print(f"{'  ' * depth}找到表相关结构: {current_path} (类型: {type(value).__name__}, 大小: {size})")

                    # 如果是字段定义
                    if 'fields' in key_lower and isinstance(value, dict):
                        print(f"{'  ' * (depth+1)}字段:")
                        for field_key, field_value in list(value.items())[:5]:
                            print(f"{'  ' * (depth+2)}- {field_key}: {type(field_value).__name__}")

            # 递归查找
            if isinstance(value, (dict, list)):
                find_table_structures(value, current_path, depth + 1, max_depth)

    elif isinstance(obj, list):
        for i, item in enumerate(obj[:3]):  # 只检查前3个元素
            find_table_structures(item, f"{path}[{i}]", depth + 1, max_depth)

def main():
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    else:
        file_path = "../02-数据文件/解析数据/柯尚订单管理.base.parsed.json"

    if not Path(file_path).exists():
        print(f"文件不存在: {file_path}")
        sys.exit(1)

    analyze_base_file(file_path)

if __name__ == "__main__":
    main()