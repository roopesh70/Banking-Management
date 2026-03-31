-- Enable crypto extension for secure hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================
-- 1. ENTITY TABLES (3NF NORMALIZED)
-- =====================================

-- Branch & Employee
CREATE TABLE IF NOT EXISTS branch (
    branch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_name VARCHAR(100) NOT NULL,
    pincode VARCHAR(20) NOT NULL,
    address TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS employee (
    employee_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    department VARCHAR(50) NOT NULL,
    branch_id UUID REFERENCES branch(branch_id),
    managed_branch_id UUID REFERENCES branch(branch_id) UNIQUE
);

-- Customer
CREATE TABLE IF NOT EXISTS customer (
    customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    gender VARCHAR(20),
    contact_number VARCHAR(20) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    government_id VARCHAR(50) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Login & Authentication (REQ-4A, REQ-3)
CREATE TABLE IF NOT EXISTS login (
    login_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID UNIQUE REFERENCES customer(customer_id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    failed_attempts INT DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE
);

-- AuditLogs (REQ-4B)
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50),
    event_type VARCHAR(50) NOT NULL,
    ip_address INET,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Account
CREATE TABLE IF NOT EXISTS account (
    account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_number VARCHAR(20) UNIQUE NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('Savings', 'Current')),
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    branch_id UUID REFERENCES branch(branch_id),
    customer_id UUID REFERENCES customer(customer_id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Frozen', 'Closed')),
    daily_transaction_limit DECIMAL(15, 2) DEFAULT 50000.00
);

-- Beneficiary
CREATE TABLE IF NOT EXISTS beneficiary (
    beneficiary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customer(customer_id) ON DELETE CASCADE,
    payee_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(20) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    daily_transfer_limit DECIMAL(15, 2) DEFAULT 10000.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transaction
CREATE TABLE IF NOT EXISTS transaction (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_ref VARCHAR(50) UNIQUE,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('Deposit', 'Withdrawal', 'Transfer')),
    status VARCHAR(20) NOT NULL DEFAULT 'Completed' CHECK (status IN ('Completed', 'Pending_Approval', 'Failed')),
    from_account_id UUID REFERENCES account(account_id),
    to_account_id UUID REFERENCES account(account_id),
    beneficiary_id UUID REFERENCES beneficiary(beneficiary_id),
    is_scheduled BOOLEAN DEFAULT FALSE,
    scheduled_for DATE
);

-- Loan & Repayment
CREATE TABLE IF NOT EXISTS loan (
    loan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customer(customer_id) ON DELETE CASCADE,
    principal_amount DECIMAL(15, 2) NOT NULL CHECK (principal_amount > 0),
    interest_rate DECIMAL(5, 2) NOT NULL,
    tenure_months INT NOT NULL CHECK (tenure_months > 0),
    loan_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Closed')),
    applied_on TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS repayment_schedule (
    schedule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID REFERENCES loan(loan_id) ON DELETE CASCADE,
    due_date DATE NOT NULL,
    emi_amount DECIMAL(15, 2) NOT NULL,
    pay_status VARCHAR(20) NOT NULL DEFAULT 'Unpaid' CHECK (pay_status IN ('Unpaid', 'Paid', 'Overdue'))
);

-- =====================================
-- 2. TRIGGERS & FUNCTIONS
-- =====================================

-- Auto-generate Transaction Ref (REQ-12A)
CREATE OR REPLACE FUNCTION generate_transaction_ref()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transaction_ref IS NULL THEN
        NEW.transaction_ref := 'TXN' || TO_CHAR(NOW(), 'YYMMDDHH24MISS') || LPAD(TRUNC(RANDOM() * 9999)::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_txn_ref
BEFORE INSERT ON transaction
FOR EACH ROW
EXECUTE FUNCTION generate_transaction_ref();

-- Transaction Validation and Balance Maintenance (REQ-6, REQ-12, REQ-14A, REQ-14B)
CREATE OR REPLACE FUNCTION process_transaction_logic()
RETURNS TRIGGER AS $$
DECLARE
    v_from_balance DECIMAL(15, 2);
    v_from_status VARCHAR(20);
    v_daily_limit DECIMAL(15, 2);
    v_today_transferred DECIMAL(15, 2);
    v_ben_created_at TIMESTAMP;
    v_ben_daily_limit DECIMAL(15, 2);
BEGIN
    -- Only process completed transactions
    IF NEW.status != 'Completed' THEN
        RETURN NEW;
    END IF;

    -- If Transfer > 100000, mark as pending admin approval (Business Rule 5.5)
    IF NEW.type = 'Transfer' AND NEW.amount > 100000 THEN
        NEW.status := 'Pending_Approval';
        RETURN NEW;
    END IF;

    -- Process Withdrawal/Transfer
    IF NEW.type IN ('Withdrawal', 'Transfer') AND NEW.from_account_id IS NOT NULL THEN
        -- Check Account Status
        SELECT balance, status, daily_transaction_limit INTO v_from_balance, v_from_status, v_daily_limit
        FROM account WHERE account_id = NEW.from_account_id FOR UPDATE;

        IF v_from_status = 'Frozen' THEN
            RAISE EXCEPTION 'Account is frozen. Transactions not allowed.';
        END IF;

        IF v_from_balance < NEW.amount THEN
            RAISE EXCEPTION 'Insufficient balance.';
        END IF;

        -- Check Daily Account Transfer Limit
        SELECT COALESCE(SUM(amount), 0) INTO v_today_transferred
        FROM transaction
        WHERE from_account_id = NEW.from_account_id 
        AND type IN ('Withdrawal', 'Transfer')
        AND DATE(timestamp) = CURRENT_DATE
        AND status = 'Completed';
        
        IF (v_today_transferred + NEW.amount) > v_daily_limit THEN
            RAISE EXCEPTION 'Daily transaction limit exceeded.';
        END IF;

        -- Beneficiary checks
        IF NEW.type = 'Transfer' AND NEW.beneficiary_id IS NOT NULL THEN
            SELECT created_at, daily_transfer_limit INTO v_ben_created_at, v_ben_daily_limit
            FROM beneficiary WHERE beneficiary_id = NEW.beneficiary_id;

            -- Cooling Period (24h)
            IF NOW() < (v_ben_created_at + INTERVAL '24 hours') THEN
                RAISE EXCEPTION 'Beneficiary is in cooling period (24 hours).';
            END IF;

            -- Beneficiary Daily Limit
            SELECT COALESCE(SUM(amount), 0) INTO v_today_transferred
            FROM transaction
            WHERE from_account_id = NEW.from_account_id 
            AND beneficiary_id = NEW.beneficiary_id
            AND DATE(timestamp) = CURRENT_DATE
            AND status = 'Completed';

            IF (v_today_transferred + NEW.amount) > v_ben_daily_limit THEN
                RAISE EXCEPTION 'Daily limit for this beneficiary exceeded.';
            END IF;
        END IF;

        -- Deduct Balance
        UPDATE account SET balance = balance - NEW.amount WHERE account_id = NEW.from_account_id;
    END IF;

    -- Process Deposit/Transfer Received
    IF NEW.type IN ('Deposit', 'Transfer') AND NEW.to_account_id IS NOT NULL THEN
        UPDATE account SET balance = balance + NEW.amount WHERE account_id = NEW.to_account_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_process_transaction
BEFORE INSERT ON transaction
FOR EACH ROW
EXECUTE FUNCTION process_transaction_logic();

-- Loan Approval EMI Generator (REQ-17)
CREATE OR REPLACE FUNCTION generate_emi_schedule()
RETURNS TRIGGER AS $$
DECLARE
    i INT;
    v_emi_amount DECIMAL(15, 2);
    v_monthly_rate DECIMAL(15, 5);
BEGIN
    IF OLD.status = 'Pending' AND NEW.status = 'Approved' THEN
        -- Flat EMI calculation
        v_monthly_rate := (NEW.interest_rate / 100.0) / 12.0;
        v_emi_amount := (NEW.principal_amount * v_monthly_rate * POWER(1 + v_monthly_rate, NEW.tenure_months)) / (POWER(1 + v_monthly_rate, NEW.tenure_months) - 1);
        
        FOR i IN 1..NEW.tenure_months LOOP
            INSERT INTO repayment_schedule (loan_id, due_date, emi_amount)
            VALUES (NEW.loan_id, CURRENT_DATE + (i || ' month')::INTERVAL, v_emi_amount);
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_emi
AFTER UPDATE ON loan
FOR EACH ROW
EXECUTE FUNCTION generate_emi_schedule();

-- =====================================
-- 3. STORED PROCEDURES (RPCs)
-- =====================================

-- Secure Login Check (REQ-2, REQ-3)
CREATE OR REPLACE FUNCTION authenticate_user(p_username VARCHAR, p_password VARCHAR, p_ip VARCHAR)
RETURNS JSONB AS $$
DECLARE
    v_login_record login%ROWTYPE;
    v_response JSONB;
BEGIN
    SELECT * INTO v_login_record FROM login WHERE username = p_username;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid username or password');
    END IF;
    
    IF v_login_record.locked_until > NOW() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Account is temporarily locked. Try again later.');
    END IF;
    
    -- Verify Password
    IF v_login_record.password_hash = crypt(p_password, v_login_record.password_hash) THEN
        -- Reset failed attempts
        UPDATE login SET failed_attempts = 0, locked_until = NULL, last_login = NOW() WHERE login_id = v_login_record.login_id;
        
        INSERT INTO audit_logs (username, event_type, ip_address) VALUES (p_username, 'LOGIN_SUCCESS', p_ip::INET);
        
        RETURN jsonb_build_object('success', true, 'customer_id', v_login_record.customer_id);
    ELSE
        -- Increment failed attempts
        UPDATE login SET failed_attempts = failed_attempts + 1 WHERE login_id = v_login_record.login_id;
        INSERT INTO audit_logs (username, event_type, ip_address) VALUES (p_username, 'LOGIN_FAILED', p_ip::INET);
        
        IF (v_login_record.failed_attempts + 1) >= 5 THEN
            UPDATE login SET locked_until = NOW() + INTERVAL '15 minutes' WHERE login_id = v_login_record.login_id;
            RETURN jsonb_build_object('success', false, 'message', 'Account locked due to 5 failed attempts.');
        END IF;
        
        RETURN jsonb_build_object('success', false, 'message', 'Invalid username or password');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Register Custom Customer & Login
CREATE OR REPLACE FUNCTION register_customer(
    p_name VARCHAR, p_email VARCHAR, p_contact VARCHAR, p_dob DATE, 
    p_gov_id VARCHAR, p_address TEXT, p_username VARCHAR, p_password VARCHAR,
    p_gender VARCHAR DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_customer_id UUID;
BEGIN
    INSERT INTO customer (name, email, contact_number, date_of_birth, government_id, address, gender)
    VALUES (p_name, p_email, p_contact, p_dob, p_gov_id, p_address, p_gender)
    RETURNING customer_id INTO v_customer_id;
    
    INSERT INTO login (customer_id, username, password_hash)
    VALUES (v_customer_id, p_username, crypt(p_password, gen_salt('bf', 12)));
    
    RETURN v_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
