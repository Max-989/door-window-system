-- 门窗安装管理系统 - 初始数据库schema
-- 版本: 1.0
-- 日期: 2026-03-18
-- 说明: 基于TypeORM实体生成的建表语句

-- 创建数据库
-- CREATE DATABASE IF NOT EXISTS door_installation_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE door_installation_db;

-- 1. 用户表
CREATE TABLE `users` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `phone` varchar(20) UNIQUE NOT NULL,
  `email` varchar(100) UNIQUE,
  `wechat_openid` varchar(100) UNIQUE,
  `wechat_unionid` varchar(100),
  `password` varchar(255),
  `real_name` varchar(100),
  `id_card` varchar(20),
  `avatar` varchar(500),
  `role` enum('admin','manager','installer','customer','guest') DEFAULT 'guest',
  `status` enum('active','inactive','suspended') DEFAULT 'active',
  `company_id` int,
  `address` varchar(500),
  `last_login_at` datetime,
  `login_count` int DEFAULT 0,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 2. 角色表
CREATE TABLE `roles` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `name` varchar(100) UNIQUE NOT NULL,
  `code` enum('admin','factory_manager','service_manager','measurement_specialist','installer','after_sales','company_manager','designer','sales','direct_customer','guest') NOT NULL,
  `description` text,
  `permissions` json,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

-- 3. 权限表
CREATE TABLE `permissions` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `code` varchar(100) UNIQUE NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `resource` enum('order','measurement','installation','maintenance','product','inventory','customer','user','role','payment','report','system') NOT NULL,
  `action` enum('create','read','update','delete','approve','reject','assign','export','import','audit') NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表';

-- 4. 客户表（单表继承）
CREATE TABLE `customers` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `code` varchar(50) UNIQUE NOT NULL,
  `name` varchar(200) NOT NULL,
  `type` enum('company','direct') NOT NULL,
  `contact_person` varchar(100),
  `phone` varchar(20),
  `email` varchar(100),
  `address` varchar(500),
  `region` varchar(100),
  `status` enum('active','inactive','suspended') DEFAULT 'active',
  `total_orders` int DEFAULT 0,
  `total_amount` decimal(12,2) DEFAULT 0,

  -- 装企客户特定字段
  `company_type` enum('design_company','construction_company','decoration_company','integrated_company'),
  `cooperation_level` enum('strategic','preferred','standard','trial'),
  `commission_rate` decimal(5,2),
  `contract_start_date` date,
  `contract_end_date` date,
  `sales_person_id` int,
  `decorate_company_id` int,

  -- 直接客户特定字段
  `source` enum('recommendation','advertisement','website','exhibition','store_visit','phone_inquiry','other'),
  `is_vip` boolean DEFAULT FALSE,
  `vip_level` enum('none','bronze','silver','gold','diamond') DEFAULT 'none',
  `referrer_id` int,
  `first_contact_date` date,
  `remarks` text,

  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户表（单表继承）';

-- 5. 装企表
CREATE TABLE `decorate_companies` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `code` varchar(50) UNIQUE NOT NULL,
  `name` varchar(200) NOT NULL,
  `region` varchar(100) NOT NULL,
  `contact_person` varchar(100),
  `phone` varchar(20),
  `email` varchar(100),
  `address` varchar(500),
  `description` text,
  `status` enum('active','inactive','suspended') DEFAULT 'active',
  `contract_start_date` date,
  `contract_end_date` date,
  `cooperation_level` varchar(50),
  `commission_rate` decimal(5,2),
  `total_orders` int DEFAULT 0,
  `completed_orders` int DEFAULT 0,
  `total_amount` decimal(12,2) DEFAULT 0,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='装企表';

-- 6. 订单表
CREATE TABLE `orders` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `order_no` varchar(50) UNIQUE NOT NULL,
  `customer_id` int NOT NULL,
  `customer_type` enum('company','direct') NOT NULL,
  `company_customer_id` int,
  `sales_person_id` int,
  `designer_id` int,
  `measurement_request_id` int,
  `total_amount` decimal(12,2) DEFAULT 0,
  `paid_amount` decimal(12,2) DEFAULT 0,
  `discount_amount` decimal(12,2) DEFAULT 0,
  `status` enum('draft','submitted','reviewing','confirmed','cancelled') DEFAULT 'draft',
  `production_status` enum('pending','in_production','completed','shipped_to_warehouse','arrived_warehouse','shipped_to_site','arrived_site') DEFAULT 'pending',
  `installation_status` enum('pending_assignment','assigned','scheduling','in_progress','completed','accepted','rated') DEFAULT 'pending_assignment',
  `payment_status` enum('pending','partial','completed','refunded') DEFAULT 'pending',
  `order_date` date NOT NULL,
  `expected_delivery_date` date,
  `actual_delivery_date` date,
  `installation_address` text,
  `notes` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_customer` (`customer_id`),
  INDEX `idx_order_date` (`order_date`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='销售订单表';

-- 7. 订单明细表
CREATE TABLE `order_items` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `product_id` int,
  `product_name` varchar(200) NOT NULL,
  `product_spec` text,
  `quantity` decimal(10,2) NOT NULL,
  `unit_price` decimal(12,2) NOT NULL,
  `total_price` decimal(12,2) NOT NULL,
  `material_cost` decimal(12,2) DEFAULT 0,
  `labor_cost` decimal(12,2) DEFAULT 0,
  `notes` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_order` (`order_id`),
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单明细表';

-- 8. 产品表
CREATE TABLE `products` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `code` varchar(50) UNIQUE NOT NULL,
  `name` varchar(200) NOT NULL,
  `category` enum('window','door','accessory','material') NOT NULL,
  `type` varchar(100),
  `specifications` json,
  `unit` varchar(20) NOT NULL,
  `unit_price` decimal(12,2) NOT NULL,
  `cost_price` decimal(12,2),
  `manufacturer_id` int,
  `lead_time` int,
  `status` enum('active','inactive','discontinued') DEFAULT 'active',
  `description` text,
  `images` json,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_category` (`category`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品表';

-- 9. 材料表
CREATE TABLE `materials` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `name` varchar(200) NOT NULL,
  `category` enum('hardware','sealant','screw','adhesive','insulation','other') NOT NULL,
  `specification` varchar(200),
  `unit` varchar(20) NOT NULL,
  `unit_price` decimal(12,2) NOT NULL,
  `supplier_id` int,
  `min_stock_level` int DEFAULT 0,
  `max_stock_level` int DEFAULT 100,
  `safety_stock_level` int DEFAULT 10,
  `description` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='材料表';

-- 10. 安装任务表
CREATE TABLE `installation_tasks` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `task_no` varchar(50) NOT NULL,
  `assigned_to` int NOT NULL,
  `assigned_by` int,
  `scheduled_date` date,
  `actual_date` date,
  `time_slot` varchar(50),
  `address` text NOT NULL,
  `status` enum('pending','assigned','confirmed','in_progress','completed','accepted','rated') DEFAULT 'pending',
  `completion_photos` json,
  `customer_rating` decimal(3,1),
  `customer_feedback` text,
  `installer_notes` text,
  `start_time` datetime,
  `end_time` datetime,
  `duration_minutes` int,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_order` (`order_id`),
  INDEX `idx_installer` (`assigned_to`),
  INDEX `idx_status` (`status`),
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='安装任务表';

-- 11. 量尺需求表
CREATE TABLE `measurement_requests` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `request_no` varchar(50) UNIQUE NOT NULL,
  `customer_id` int NOT NULL,
  `customer_type` enum('company','direct') NOT NULL,
  `requested_by` int NOT NULL,
  `request_type` enum('new','followup','repair') DEFAULT 'new',
  `property_address` text NOT NULL,
  `property_type` enum('residential','commercial','villa','apartment') NOT NULL,
  `measurement_date` date NOT NULL,
  `time_slot` varchar(50),
  `special_requirements` text,
  `status` enum('pending','submitted','assigned','in_progress','completed','reviewed') DEFAULT 'pending',
  `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_customer` (`customer_id`),
  INDEX `idx_date` (`measurement_date`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='量尺需求表';

-- 12. 量尺任务表
CREATE TABLE `measurement_tasks` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `measurement_request_id` int NOT NULL,
  `assigned_to` int NOT NULL,
  `scheduled_date` date NOT NULL,
  `actual_date` date,
  `start_time` datetime,
  `end_time` datetime,
  `measurement_data` json,
  `photos` json,
  `notes` text,
  `status` enum('assigned','confirmed','in_progress','completed','cancelled') DEFAULT 'assigned',
  `completion_rating` decimal(3,1),
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_request` (`measurement_request_id`),
  INDEX `idx_assignee` (`assigned_to`),
  INDEX `idx_status` (`status`),
  FOREIGN KEY (`measurement_request_id`) REFERENCES `measurement_requests`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='量尺任务表';

-- 13. 维修申请表
CREATE TABLE `maintenance_requests` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `request_no` varchar(50) UNIQUE NOT NULL,
  `order_id` int NOT NULL,
  `customer_id` int NOT NULL,
  `issue_type` enum('quality','damage','function','other') NOT NULL,
  `issue_description` text NOT NULL,
  `photos` json,
  `urgency` enum('low','medium','high') DEFAULT 'medium',
  `preferred_date` date,
  `status` enum('submitted','assigned','in_progress','completed','closed') DEFAULT 'submitted',
  `resolution` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_order` (`order_id`),
  INDEX `idx_customer` (`customer_id`),
  INDEX `idx_status` (`status`),
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='维修申请表';

-- 14. 支付记录表
CREATE TABLE `payments` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `payment_no` varchar(50) UNIQUE NOT NULL,
  `order_id` int NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `payment_method` enum('cash','bank_transfer','wechat_pay','alipay') NOT NULL,
  `payment_status` enum('pending','processing','completed','failed','refunded') DEFAULT 'pending',
  `transaction_id` varchar(100),
  `paid_by` varchar(100),
  `paid_at` datetime,
  `notes` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_order` (`order_id`),
  INDEX `idx_payment_no` (`payment_no`),
  INDEX `idx_status` (`payment_status`),
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付记录表';

-- 15. 地址表
CREATE TABLE `locations` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `address_type` enum('installation','billing','shipping') DEFAULT 'installation',
  `contact_person` varchar(100),
  `phone` varchar(20),
  `province` varchar(50),
  `city` varchar(50),
  `district` varchar(50),
  `street` varchar(500),
  `postal_code` varchar(10),
  `latitude` decimal(10,8),
  `longitude` decimal(11,8),
  `is_default` boolean DEFAULT FALSE,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_customer` (`customer_id`),
  INDEX `idx_type` (`address_type`),
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='地址表';

-- 16. 通知表
CREATE TABLE `notifications` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `type` enum('order_update','task_assigned','measurement_result','payment','system') NOT NULL,
  `title` varchar(200) NOT NULL,
  `content` text NOT NULL,
  `related_id` int,
  `related_type` varchar(50),
  `is_read` boolean DEFAULT FALSE,
  `read_at` datetime,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_user` (`user_id`),
  INDEX `idx_type` (`type`),
  INDEX `idx_read` (`is_read`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知表';

-- 17. 库存表
CREATE TABLE `inventories` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `product_id` int,
  `material_id` int,
  `item_type` enum('product','material') NOT NULL,
  `warehouse_id` int,
  `quantity` int DEFAULT 0,
  `reserved_quantity` int DEFAULT 0,
  `available_quantity` int DEFAULT 0,
  `last_stock_take` date,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_product` (`product_id`),
  INDEX `idx_material` (`material_id`),
  INDEX `idx_type` (`item_type`),
  CHECK ((product_id IS NOT NULL AND material_id IS NULL) OR (product_id IS NULL AND material_id IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存表';

-- 创建外键约束（补充）
ALTER TABLE `users` ADD FOREIGN KEY (`company_id`) REFERENCES `decorate_companies`(`id`) ON DELETE SET NULL;

-- 创建视图（可选）
-- CREATE VIEW order_summary AS
-- SELECT o.id, o.order_no, c.name as customer_name, o.total_amount, o.status, o.order_date
-- FROM orders o
-- JOIN customers c ON o.customer_id = c.id;

-- 初始化数据（示例）
-- INSERT INTO roles (name, code, description) VALUES
-- ('管理员', 'admin', '系统管理员，拥有所有权限'),
-- ('装企经理', 'company_manager', '装企客户经理'),
-- ('安装师傅', 'installer', '安装服务人员');

-- 输出完成信息
SELECT '数据库schema创建完成，共17个表' AS message;