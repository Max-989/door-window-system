#!/usr/bin/env python3
import json
import gzip
import base64
import sys
from pathlib import Path

def parse_base_file(file_path):
    """解析 .base 文件"""
    print(f"正在解析文件: {file_path}")

    try:
        # 读取文件内容
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        print(f"文件类型: JSON")
        print(f"文件大小: {Path(file_path).stat().st_size} 字节")

        # 检查是否有gzipSnapshot字段
        if 'gzipSnapshot' in data:
            print("检测到 gzipSnapshot 字段")

            # 解码base64
            gzip_data = base64.b64decode(data['gzipSnapshot'])
            print(f"gzip数据大小: {len(gzip_data)} 字节")

            # 解压gzip数据
            try:
                decompressed = gzip.decompress(gzip_data)
                print(f"解压后数据大小: {len(decompressed)} 字节")

                # 尝试解析解压后的数据
                try:
                    json_data = json.loads(decompressed.decode('utf-8'))
                    print("解压数据为有效的JSON格式")

                    # 分析JSON结构
                    analyze_json_structure(json_data)

                    return json_data
                except json.JSONDecodeError as e:
                    print(f"解压数据不是有效的JSON: {e}")
                    # 可能是其他格式，保存为文本文件查看
                    output_path = file_path + '.decompressed.txt'
                    with open(output_path, 'w', encoding='utf-8') as f:
                        f.write(decompressed.decode('utf-8', errors='ignore'))
                    print(f"已保存解压数据到: {output_path}")
                    return None
            except gzip.BadGzipFile as e:
                print(f"gzip解压失败: {e}")
                return None
        else:
            print("未找到 gzipSnapshot 字段，直接分析JSON结构")
            analyze_json_structure(data)
            return data

    except Exception as e:
        print(f"解析文件时出错: {e}")
        import traceback
        traceback.print_exc()
        return None

def analyze_json_structure(data):
    """分析JSON数据结构"""
    print("\n=== JSON结构分析 ===")

    if isinstance(data, dict):
        print(f"顶级对象包含 {len(data)} 个键")
        print("顶级键列表:")
        for i, key in enumerate(list(data.keys())[:20]):
            print(f"  {i+1}. {key}: {type(data[key])}")
            if isinstance(data[key], (dict, list)):
                print(f"     包含 {len(data[key]) if isinstance(data[key], (dict, list)) else 'N/A'} 个元素")

        if len(data) > 20:
            print(f"  ... 还有 {len(data) - 20} 个键")

        # 检查是否有表结构信息
        tables = find_tables(data)
        if tables:
            print(f"\n发现 {len(tables)} 个可能的数据表:")
            for table_name, table_info in tables.items():
                print(f"  - {table_name}: {table_info}")

    elif isinstance(data, list):
        print(f"顶级数组包含 {len(data)} 个元素")
        if len(data) > 0:
            print("第一个元素类型:", type(data[0]))
            if isinstance(data[0], dict):
                print("第一个元素的键:", list(data[0].keys())[:10])

    # 尝试查找数据库相关信息
    find_database_info(data)

def find_tables(data, path=""):
    """查找可能的数据表结构"""
    tables = {}

    if isinstance(data, dict):
        # 检查是否有表名相关的键
        table_keywords = ['table', 'tables', 'schema', 'columns', 'fields', 'records']

        for key, value in data.items():
            current_path = f"{path}.{key}" if path else key

            # 如果键名包含表相关关键词
            if any(keyword in key.lower() for keyword in table_keywords):
                if isinstance(value, (dict, list)):
                    tables[current_path] = f"类型: {type(value).__name__}, 大小: {len(value) if hasattr(value, '__len__') else 'N/A'}"

            # 递归查找
            if isinstance(value, (dict, list)):
                tables.update(find_tables(value, current_path))

    return tables

def find_database_info(data):
    """查找数据库相关信息"""
    print("\n=== 数据库信息查找 ===")

    def search_recursive(obj, depth=0, max_depth=3):
        if depth > max_depth:
            return

        if isinstance(obj, dict):
            for key, value in obj.items():
                # 检查是否有数据库相关字段
                db_keywords = ['database', 'db', 'sql', 'mysql', 'postgres', 'oracle',
                              'host', 'port', 'user', 'password', 'name', 'type']

                if any(keyword in str(key).lower() for keyword in db_keywords):
                    print(f"  {'  ' * depth}找到数据库相关字段: {key} = {value}")

                if isinstance(value, (dict, list)):
                    search_recursive(value, depth + 1, max_depth)
        elif isinstance(obj, list):
            for item in obj[:5]:  # 只检查前5个元素
                search_recursive(item, depth + 1, max_depth)

    search_recursive(data)

def main():
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    else:
        file_path = "../02-数据文件/原始数据/柯尚订单管理.base"

    if not Path(file_path).exists():
        print(f"文件不存在: {file_path}")
        sys.exit(1)

    result = parse_base_file(file_path)

    if result is not None:
        print("\n=== 解析完成 ===")
        # 保存解析结果到解析数据目录
        input_path = Path(file_path)
        output_filename = input_path.stem + '.parsed.json'
        output_json = Path("../02-数据文件/解析数据") / output_filename
        output_json.parent.mkdir(parents=True, exist_ok=True)

        with open(output_json, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"已保存解析结果到: {output_json}")

if __name__ == "__main__":
    main()