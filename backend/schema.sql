-- Core schema created: admins, routers, router_provisioning_tokens, plans, customers, vouchers, transactions, sessions, router_events, portal_settings

CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE routers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    api_port INTEGER DEFAULT 8728,
    api_user VARCHAR(255),
    api_password VARCHAR(255),
    status VARCHAR(50) DEFAULT 'offline',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE router_provisioning_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) UNIQUE NOT NULL,
    router_id INTEGER REFERENCES routers(id),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    download_speed VARCHAR(50),
    upload_speed VARCHAR(50),
    data_limit_mb INTEGER,
    duration_days INTEGER
);

CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    phone_number VARCHAR(50),
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vouchers (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    plan_id INTEGER REFERENCES plans(id),
    status VARCHAR(50) DEFAULT 'active',
    customer_id INTEGER REFERENCES customers(id),
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    reference VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    customer_id INTEGER REFERENCES customers(id),
    plan_id INTEGER REFERENCES plans(id),
    payment_method VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    router_id INTEGER REFERENCES routers(id),
    mac_address VARCHAR(50),
    ip_address VARCHAR(45),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    bytes_in BIGINT DEFAULT 0,
    bytes_out BIGINT DEFAULT 0
);

CREATE TABLE router_events (
    id SERIAL PRIMARY KEY,
    router_id INTEGER REFERENCES routers(id),
    event_type VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE portal_settings (
    id SERIAL PRIMARY KEY,
    router_id INTEGER REFERENCES routers(id),
    theme_color VARCHAR(20),
    logo_url VARCHAR(255),
    title VARCHAR(255),
    terms_text TEXT
);
