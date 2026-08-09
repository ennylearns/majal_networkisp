-- Core schema

CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE routers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'offline', -- online, offline, provisioning, error
    routeros_version VARCHAR(50),
    architecture VARCHAR(50),
    hotspot_subnet VARCHAR(45),
    hotspot_gateway VARCHAR(45),
    hotspot_pool_range VARCHAR(100),
    wireguard_peer_config TEXT,
    wireguard_public_key VARCHAR(255),
    last_seen_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE router_provisioning_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) UNIQUE NOT NULL,
    router_id INTEGER REFERENCES routers(id) UNIQUE, -- scoped to exactly one router
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    provisioning_result TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    data_allowance BIGINT,
    duration INTEGER,
    download_speed VARCHAR(50),
    upload_speed VARCHAR(50),
    mikrotik_profile_name VARCHAR(255),
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(50),
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    plan_id INTEGER REFERENCES plans(id),
    paystack_reference VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, successful, failed, cancelled, refunded
    webhook_received_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vouchers (
    id SERIAL PRIMARY KEY,
    code_hash VARCHAR(255) NOT NULL,
    plan_id INTEGER REFERENCES plans(id),
    transaction_id INTEGER REFERENCES transactions(id),
    phone_number VARCHAR(50),
    email VARCHAR(255),
    status VARCHAR(50) DEFAULT 'unused', -- unused, active, expired, exhausted, disabled
    activation_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, ACTIVATED, FAILED
    router_id INTEGER REFERENCES routers(id),
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    voucher_id INTEGER REFERENCES vouchers(id),
    router_id INTEGER REFERENCES routers(id),
    username VARCHAR(255),
    ip_address VARCHAR(45),
    mac_address VARCHAR(50),
    data_used BIGINT DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE router_events (
    id SERIAL PRIMARY KEY,
    router_id INTEGER REFERENCES routers(id),
    event_type VARCHAR(100) NOT NULL,
    detail JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE portal_settings (
    id SERIAL PRIMARY KEY,
    logo_url VARCHAR(255),
    business_name VARCHAR(255),
    welcome_message TEXT,
    contact_info TEXT,
    terms TEXT,
    visible_plan_ids INTEGER[],
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
