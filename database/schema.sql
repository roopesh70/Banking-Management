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
    managed_branch_id UUID REFERENCES branch(branch_id) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE
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

-- Account (supports both internal & external inter-bank accounts)
CREATE TABLE IF NOT EXISTS account (
    account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_number VARCHAR(20) UNIQUE NOT NULL,
    account_type VARCHAR(20) CHECK (account_type IN ('Savings', 'Current')),
    balance DECIMAL(15, 2) DEFAULT 0.00 CHECK (balance >= 0),
    branch_id UUID REFERENCES branch(branch_id),
    customer_id UUID REFERENCES customer(customer_id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Frozen', 'Closed')),
    daily_transaction_limit DECIMAL(15, 2) DEFAULT 50000.00,
    is_external BOOLEAN DEFAULT FALSE
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
    status VARCHAR(20) NOT NULL DEFAULT 'Completed' CHECK (status IN ('Completed', 'Pending_Approval', 'Failed', 'Scheduled')),
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

DROP TRIGGER IF EXISTS trg_generate_txn_ref ON transaction;
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
    v_to_status VARCHAR(20);
    v_daily_limit DECIMAL(15, 2);
    v_today_transferred DECIMAL(15, 2);
    v_ben_daily_limit DECIMAL(15, 2);
    v_ben_created_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Only process completed transactions
    IF NEW.status != 'Completed' THEN
        RETURN NEW;
    END IF;

    -- If this is an UPDATE and it was already Completed or Failed, do nothing
    IF TG_OP = 'UPDATE' AND OLD.status IN ('Completed', 'Failed') THEN
        RETURN NEW;
    END IF;

    -- If Transfer > 100000, mark as pending admin approval (Business Rule 5.5)
    -- BUT ONLY if this is a fresh INSERT! If it's an admin approval (UPDATE), let it pass as Completed.
    IF TG_OP = 'INSERT' AND NEW.type = 'Transfer' AND NEW.amount > 100000 THEN
        NEW.status := 'Pending_Approval';
        RETURN NEW;
    END IF;

    -- Lock accounts in consistent order to prevent deadlocks
    IF NEW.from_account_id IS NOT NULL AND NEW.to_account_id IS NOT NULL THEN
        IF NEW.from_account_id < NEW.to_account_id THEN
            PERFORM 1 FROM account WHERE account_id = NEW.from_account_id FOR UPDATE;
            PERFORM 1 FROM account WHERE account_id = NEW.to_account_id FOR UPDATE;
        ELSE
            PERFORM 1 FROM account WHERE account_id = NEW.to_account_id FOR UPDATE;
            PERFORM 1 FROM account WHERE account_id = NEW.from_account_id FOR UPDATE;
        END IF;
    ELSIF NEW.from_account_id IS NOT NULL THEN
        PERFORM 1 FROM account WHERE account_id = NEW.from_account_id FOR UPDATE;
    ELSIF NEW.to_account_id IS NOT NULL THEN
        PERFORM 1 FROM account WHERE account_id = NEW.to_account_id FOR UPDATE;
    END IF;

    -- Process Withdrawal/Transfer/Preclosure
    IF NEW.type IN ('Withdrawal', 'Transfer', 'Preclosure') AND NEW.from_account_id IS NOT NULL THEN
        -- Check Account Status
        SELECT balance, status, daily_transaction_limit INTO v_from_balance, v_from_status, v_daily_limit
        FROM account WHERE account_id = NEW.from_account_id;

        IF v_from_status = 'Frozen' THEN
            RAISE EXCEPTION 'Source account is frozen. Transactions not allowed.';
        END IF;

        IF v_from_status = 'Closed' THEN
            RAISE EXCEPTION 'Source account is closed. Transactions not allowed.';
        END IF;

        IF v_from_balance < NEW.amount THEN
            RAISE EXCEPTION 'Insufficient balance.';
        END IF;

        -- Check Daily Account Transfer Limit (Bypass if Preclosure)
        IF NEW.type != 'Preclosure' THEN
            SELECT COALESCE(SUM(amount), 0) INTO v_today_transferred
            FROM transaction
            WHERE from_account_id = NEW.from_account_id 
            AND type IN ('Withdrawal', 'Transfer')
            AND DATE(timestamp) = CURRENT_DATE
            AND status = 'Completed';
            
            IF (v_today_transferred + NEW.amount) > v_daily_limit THEN
                RAISE EXCEPTION 'Daily transaction limit exceeded.';
            END IF;
        END IF;

        -- Beneficiary checks
        IF NEW.type = 'Transfer' AND NEW.beneficiary_id IS NOT NULL THEN
            SELECT daily_transfer_limit, created_at INTO v_ben_daily_limit, v_ben_created_at
            FROM beneficiary WHERE beneficiary_id = NEW.beneficiary_id;

            -- 24-hour cooling threshold validation (REQ-14B)
            IF (NOW() - v_ben_created_at) < INTERVAL '24 hours' THEN
                RAISE EXCEPTION 'Beneficiary is in 24-hour cooling period. Transfers not allowed yet.';
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
        -- Check Destination Account Status
        SELECT status INTO v_to_status FROM account WHERE account_id = NEW.to_account_id;
        
        IF v_to_status = 'Frozen' THEN
            RAISE EXCEPTION 'Destination account is frozen. Transactions not allowed.';
        END IF;

        IF v_to_status = 'Closed' THEN
            RAISE EXCEPTION 'Destination account is closed. Transactions not allowed.';
        END IF;

        UPDATE account SET balance = balance + NEW.amount WHERE account_id = NEW.to_account_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_process_transaction ON transaction;
CREATE TRIGGER trg_process_transaction
BEFORE INSERT OR UPDATE ON transaction
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

DROP TRIGGER IF EXISTS trg_generate_emi ON loan;
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
        
        RETURN jsonb_build_object('success', true, 'customer_id', v_login_record.customer_id, 'username', p_username);
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

-- =====================================
-- 4. NEW TABLES & RPCs FOR USER/ACCOUNT MGMT
-- =====================================

-- OTP Table (REQ-4)
CREATE TABLE IF NOT EXISTS password_reset_otp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Standing Instructions Table (REQ-7B)
CREATE TABLE IF NOT EXISTS standing_instruction (
    instruction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customer(customer_id) ON DELETE CASCADE,
    from_account_id UUID REFERENCES account(account_id),
    to_account_id UUID REFERENCES account(account_id),
    beneficiary_id UUID REFERENCES beneficiary(beneficiary_id),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    frequency VARCHAR(20) CHECK (frequency IN ('Daily', 'Weekly', 'Monthly')),
    next_execution_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Cancelled', 'Paused')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_destination CHECK (
        (to_account_id IS NOT NULL AND beneficiary_id IS NULL) OR
        (to_account_id IS NULL AND beneficiary_id IS NOT NULL)
    )
);
-- OTP Generation RPC
CREATE OR REPLACE FUNCTION request_password_reset(p_username_var VARCHAR, p_ip_address INET DEFAULT '0.0.0.0')
RETURNS JSONB AS $$
DECLARE
    v_otp VARCHAR(6);
    v_user_exists BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT 1 FROM login WHERE username = p_username_var) INTO v_user_exists;
    
    IF v_user_exists THEN
        -- Generate secure 6 digit OTP (Mock CSPRNG using random())
        v_otp := LPAD((FLOOR(RANDOM() * 900000) + 100000)::TEXT, 6, '0');
        
        -- Store hashed version of OTP for security
        INSERT INTO password_reset_otp (username, otp_code, expires_at)
        VALUES (p_username_var, digest(v_otp, 'sha256'), NOW() + INTERVAL '10 minutes');

        -- Security: Do not return the OTP in the response
        RETURN jsonb_build_object('success', true, 'message', 'If the account exists, an OTP has been sent to the registered contact.');
    ELSE
        -- Same generic message to prevent username enumeration
        RETURN jsonb_build_object('success', true, 'message', 'If the account exists, an OTP has been sent to the registered contact.');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- OTP Verification & Reset RPC
CREATE OR REPLACE FUNCTION reset_password_with_otp(p_username VARCHAR, p_otp VARCHAR, p_new_password VARCHAR, p_ip_address INET DEFAULT '0.0.0.0')
RETURNS JSONB AS $$
DECLARE
    v_valid BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM password_reset_otp 
        WHERE username = p_username AND otp_code = digest(p_otp, 'sha256') AND expires_at > NOW()
    ) INTO v_valid;

    IF v_valid THEN
        UPDATE login SET password_hash = crypt(p_new_password, gen_salt('bf', 12)), failed_attempts = 0, locked_until = NULL
        WHERE username = p_username;
        
        DELETE FROM password_reset_otp WHERE username = p_username;
        
        INSERT INTO audit_logs (username, event_type, ip_address) VALUES (p_username, 'PASSWORD_RESET', p_ip_address);
        RETURN jsonb_build_object('success', true, 'message', 'Password successfully reset.');
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Invalid or expired OTP.');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Logout Auditing RPC (REQ-4B)
CREATE OR REPLACE FUNCTION log_logout(p_username VARCHAR, p_ip VARCHAR DEFAULT '0.0.0.0')
RETURNS VOID AS $$
BEGIN
    IF p_username IS NOT NULL THEN
        INSERT INTO audit_logs (username, event_type, ip_address) VALUES (p_username, 'LOGOUT', p_ip::INET);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Admin Approve/Reject Transaction
CREATE OR REPLACE FUNCTION approve_transaction(p_txn_id UUID, p_status VARCHAR)
RETURNS JSONB AS $$
DECLARE
    v_txn transaction%ROWTYPE;
BEGIN
    IF p_status NOT IN ('Completed', 'Failed') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid status. Must be Completed or Failed.');
    END IF;
    
    SELECT * INTO v_txn FROM transaction WHERE transaction_id = p_txn_id;
    SELECT * INTO v_txn FROM transaction WHERE transaction_id = p_txn_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Transaction not found.');
    END IF;

    IF v_txn.status != 'Pending_Approval' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Transaction is not pending approval.');
    END IF;

    UPDATE transaction SET status = p_status WHERE transaction_id = p_txn_id;END;

$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Loan Pre-Closure Processing (REQ-17A)
CREATE OR REPLACE FUNCTION process_loan_preclosure(p_loan_id UUID, p_account_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_loan loan%ROWTYPE;
    v_outstanding DECIMAL(15, 2);
    v_penalty DECIMAL(15, 2);
    v_total_debit DECIMAL(15, 2);
    v_balance DECIMAL(15, 2);
    v_acct_status VARCHAR(20);
BEGIN
    SELECT * INTO v_loan FROM loan WHERE loan_id = p_loan_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Loan not found.'); END IF;
    IF v_loan.status != 'Approved' THEN RETURN jsonb_build_object('success', false, 'message', 'Loan is not in approved state.'); END IF;

    SELECT balance, status INTO v_balance, v_acct_status FROM account WHERE account_id = p_account_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Account not found.'); END IF;
    IF v_acct_status = 'Frozen' THEN RETURN jsonb_build_object('success', false, 'message', 'Account is frozen.'); END IF;
    IF v_acct_status = 'Closed' THEN RETURN jsonb_build_object('success', false, 'message', 'Account is closed.'); END IF;

    v_outstanding := v_loan.principal_amount; -- Simplification: full principal pre-closure
    v_penalty := v_outstanding * 0.02;
    v_total_debit := v_outstanding + v_penalty;

    IF v_balance < v_total_debit THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient funds for pre-closure debit.');
    END IF;

    -- Debit account via native trigger limits checking
    INSERT INTO transaction (from_account_id, type, amount, status, description) 
    VALUES (p_account_id, 'Preclosure', v_total_debit, 'Completed', 'Loan Pre-closure Settlement');

    -- Close loan and schedules
    UPDATE loan SET status = 'Closed' WHERE loan_id = p_loan_id;
    UPDATE repayment_schedule SET pay_status = 'Paid' WHERE loan_id = p_loan_id AND pay_status IN ('Unpaid', 'Overdue');
    RETURN jsonb_build_object('success', true, 'message', 'Loan pre-closed successfully.', 'total_debited', v_total_debit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cron Engine Simulator (REQ-17B, REQ-17C)
CREATE OR REPLACE FUNCTION simulate_cron_engine()
RETURNS JSONB AS $$
DECLARE
    v_marked_overdue INT := 0;
    v_reminders_sent INT := 0;
    v_si_processed INT := 0;
    v_si RECORD;
    v_from_status VARCHAR(20);
    v_to_status VARCHAR(20);
    v_from_balance DECIMAL(15, 2);
BEGIN
    -- Mark Overdue EMIs
    UPDATE repayment_schedule 
    SET pay_status = 'Overdue' 
    WHERE due_date < CURRENT_DATE AND pay_status = 'Unpaid';
    GET DIAGNOSTICS v_marked_overdue = ROW_COUNT;

    -- Simulate Reminders Sent (due within 5 days)
    SELECT COUNT(*) INTO v_reminders_sent 
    FROM repayment_schedule 
    WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '5 days' AND pay_status = 'Unpaid';

    -- Process Standing Instructions (Skip Paused and Cancelled)
    FOR v_si IN 
        SELECT * FROM standing_instruction 
        WHERE status = 'Active' AND next_execution_date <= CURRENT_DATE
    LOOP
        -- Check Account Status and Balance
        SELECT status, balance INTO v_from_status, v_from_balance FROM account WHERE account_id = v_si.from_account_id;
        SELECT status INTO v_to_status FROM account WHERE account_id = v_si.to_account_id;

        -- Only proceed if accounts are Active and balance is sufficient
        IF v_from_status = 'Active' AND v_to_status = 'Active' AND v_from_balance >= v_si.amount THEN
            -- Create Transaction (This will trigger process_transaction_logic to update balances)
            INSERT INTO transaction (from_account_id, to_account_id, type, amount, status, description)
            VALUES (v_si.from_account_id, v_si.to_account_id, 'Transfer', v_si.amount, 'Completed', 'Recurring Standing Instruction');

            -- Update Next Execution Date
            UPDATE standing_instruction 
            SET next_execution_date = 
                CASE v_si.frequency
                    WHEN 'Daily' THEN (v_si.next_execution_date + INTERVAL '1 day')::DATE
                    WHEN 'Weekly' THEN (v_si.next_execution_date + INTERVAL '7 days')::DATE
                    WHEN 'Monthly' THEN (v_si.next_execution_date + INTERVAL '1 month')::DATE
                    ELSE (v_si.next_execution_date + INTERVAL '1 month')::DATE
                END
            WHERE instruction_id = v_si.instruction_id;

            v_si_processed := v_si_processed + 1;
        END IF;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true, 
        'overdue_marked', v_marked_overdue, 
        'reminders_sent', v_reminders_sent,
        'standing_instructions_processed', v_si_processed
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Safe Alterations for backwards compatibility (REQ-21)
ALTER TABLE employee ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- =====================================================
-- NFR SECTION (v1.2) - Non-Functional Requirements
-- Covers: 7.1 Performance, 7.4 Maintainability,
--         7.5 Usability, Section 11 Security
-- =====================================================

-- NFR-PERF: Performance Indexes (7.1)
CREATE INDEX IF NOT EXISTS idx_account_customer_id       ON account(customer_id);
CREATE INDEX IF NOT EXISTS idx_account_branch_id         ON account(branch_id);
CREATE INDEX IF NOT EXISTS idx_account_status            ON account(status);
CREATE INDEX IF NOT EXISTS idx_transaction_from_account  ON transaction(from_account_id);
CREATE INDEX IF NOT EXISTS idx_transaction_to_account    ON transaction(to_account_id);
CREATE INDEX IF NOT EXISTS idx_transaction_timestamp     ON transaction(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_status        ON transaction(status);
CREATE INDEX IF NOT EXISTS idx_repayment_loan_id         ON repayment_schedule(loan_id);
CREATE INDEX IF NOT EXISTS idx_repayment_due_date        ON repayment_schedule(due_date);
CREATE INDEX IF NOT EXISTS idx_loan_customer_id          ON loan(customer_id);
CREATE INDEX IF NOT EXISTS idx_loan_status               ON loan(status);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp           ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_username            ON audit_logs(username);
CREATE INDEX IF NOT EXISTS idx_beneficiary_customer_id   ON beneficiary(customer_id);

-- NFR-SEC: Extend audit_logs for data-change events (Section 11)
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS table_name  VARCHAR(50);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS operation    VARCHAR(20);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS description  TEXT;

-- NFR-SEC: Data-Change Audit Trigger (Section 11)
CREATE OR REPLACE FUNCTION log_data_change()
RETURNS TRIGGER AS $$
DECLARE
    v_desc TEXT;
BEGIN
    IF TG_TABLE_NAME = 'account' THEN
        v_desc := 'Account ' || COALESCE(NEW.account_number, OLD.account_number) ||
                  ' status=' || COALESCE(NEW.status, '') ||
                  ' balance=' || COALESCE(NEW.balance::TEXT, '');
    ELSIF TG_TABLE_NAME = 'loan' THEN
        v_desc := 'Loan ' || COALESCE(NEW.loan_id::TEXT, OLD.loan_id::TEXT) ||
                  ' type=' || COALESCE(NEW.loan_type, '') ||
                  ' status=' || COALESCE(NEW.status, '');
    ELSIF TG_TABLE_NAME = 'transaction' THEN
        v_desc := 'Transaction ref=' || COALESCE(NEW.transaction_ref, '') ||
                  ' type=' || COALESCE(NEW.type, '') ||
                  ' amount=' || COALESCE(NEW.amount::TEXT, '') ||
                  ' status=' || COALESCE(NEW.status, '');
    ELSIF TG_TABLE_NAME = 'standing_instruction' THEN
        v_desc := 'Instruction ' || COALESCE(NEW.instruction_id::TEXT, OLD.instruction_id::TEXT) ||
                  ' status=' || COALESCE(NEW.status, '') ||
                  ' amount=' || COALESCE(NEW.amount::TEXT, '');
    ELSE
        v_desc := TG_TABLE_NAME || ' ' || TG_OP;
    END IF;

    INSERT INTO audit_logs (username, event_type, ip_address, table_name, operation, description)
    VALUES (
        'system',
        TG_TABLE_NAME || '_' || TG_OP,
        '127.0.0.1'::INET,
        TG_TABLE_NAME,
        TG_OP,
        v_desc
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_audit_account
AFTER INSERT OR UPDATE ON account
FOR EACH ROW EXECUTE FUNCTION log_data_change();

CREATE OR REPLACE TRIGGER trg_audit_loan
AFTER INSERT OR UPDATE ON loan
FOR EACH ROW EXECUTE FUNCTION log_data_change();

CREATE OR REPLACE TRIGGER trg_audit_transaction
AFTER INSERT OR UPDATE ON transaction
FOR EACH ROW EXECUTE FUNCTION log_data_change();

CREATE OR REPLACE TRIGGER trg_audit_standing_instruction
AFTER INSERT OR UPDATE ON standing_instruction
FOR EACH ROW EXECUTE FUNCTION log_data_change();

CREATE OR REPLACE TRIGGER trg_audit_transaction
AFTER INSERT OR UPDATE ON transaction
FOR EACH ROW EXECUTE FUNCTION log_data_change();

-- NFR-SEC: Enable Row Level Security (Section 11)
ALTER TABLE customer             ENABLE ROW LEVEL SECURITY;
ALTER TABLE login                ENABLE ROW LEVEL SECURITY;
ALTER TABLE account              ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction          ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE repayment_schedule   ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiary          ENABLE ROW LEVEL SECURITY;
ALTER TABLE standing_instruction ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch               ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee             ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_otp   ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- 1. Customer
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='customer' AND policyname='customer_self_access') THEN
    CREATE POLICY customer_self_access ON customer TO authenticated USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());
  END IF;

  -- 2. Login
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='login' AND policyname='login_self_access') THEN
    CREATE POLICY login_self_access ON login TO authenticated USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());
  END IF;

  -- 3. Account
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='account' AND policyname='account_owner_access') THEN
    CREATE POLICY account_owner_access ON account TO authenticated USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());
  END IF;

  -- 4. Transaction
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transaction' AND policyname='transaction_owner_access') THEN
    CREATE POLICY transaction_owner_access ON transaction TO authenticated 
    USING (
      EXISTS (SELECT 1 FROM account WHERE account_id IN (from_account_id, to_account_id) AND customer_id = auth.uid())
    );
  END IF;

  -- 5. Loan
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='loan' AND policyname='loan_owner_access') THEN
    CREATE POLICY loan_owner_access ON loan TO authenticated USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());
  END IF;

  -- 6. Repayment Schedule
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='repayment_schedule' AND policyname='repayment_owner_access') THEN
    CREATE POLICY repayment_owner_access ON repayment_schedule TO authenticated 
    USING (
      EXISTS (SELECT 1 FROM loan WHERE loan_id = repayment_schedule.loan_id AND customer_id = auth.uid())
    );
  END IF;

  -- 7. Beneficiary
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='beneficiary' AND policyname='beneficiary_owner_access') THEN
    CREATE POLICY beneficiary_owner_access ON beneficiary TO authenticated USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());
  END IF;

  -- 8. Standing Instruction
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='standing_instruction' AND policyname='standing_owner_access') THEN
    CREATE POLICY standing_owner_access ON standing_instruction TO authenticated USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());
  END IF;

  -- 9. Audit Logs (Restrictive)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audit_logs' AND policyname='audit_staff_access') THEN
    CREATE POLICY audit_staff_access ON audit_logs TO authenticated USING (auth.jwt() ->> 'role' IN ('staff', 'manager', 'service_role'));
  END IF;

  -- 10. Branch (Public read for authenticated users)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='branch' AND policyname='branch_read_access') THEN
    CREATE POLICY branch_read_access ON branch FOR SELECT TO authenticated USING (true);
  END IF;

  -- 11. Employee (Restrictive)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='employee' AND policyname='employee_staff_access') THEN
    CREATE POLICY employee_staff_access ON employee TO authenticated USING (auth.jwt() ->> 'role' IN ('staff', 'manager', 'service_role'));
  END IF;

  -- 12. Password Reset OTP (No client access)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='password_reset_otp' AND policyname='otp_internal_access') THEN
    CREATE POLICY otp_internal_access ON password_reset_otp TO authenticated USING (auth.jwt() ->> 'role' IN ('service_role'));
  END IF;


  -- Re-enabling 'anon' access for your custom auth system (REQ-3 Simulation)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='customer' AND policyname='allow_anon_all_customer') THEN
    CREATE POLICY allow_anon_all_customer ON customer FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='login' AND policyname='allow_anon_all_login') THEN
    CREATE POLICY allow_anon_all_login ON login FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='account' AND policyname='allow_anon_all_account') THEN
    CREATE POLICY allow_anon_all_account ON account FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transaction' AND policyname='allow_anon_all_transaction') THEN
    CREATE POLICY allow_anon_all_transaction ON transaction FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='loan' AND policyname='allow_anon_all_loan') THEN
    CREATE POLICY allow_anon_all_loan ON loan FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='repayment_schedule' AND policyname='allow_anon_all_repayment') THEN
    CREATE POLICY allow_anon_all_repayment ON repayment_schedule FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='beneficiary' AND policyname='allow_anon_all_beneficiary') THEN
    CREATE POLICY allow_anon_all_beneficiary ON beneficiary FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='standing_instruction' AND policyname='allow_anon_all_standing') THEN
    CREATE POLICY allow_anon_all_standing ON standing_instruction FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audit_logs' AND policyname='allow_anon_all_audit') THEN
    CREATE POLICY allow_anon_all_audit ON audit_logs FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='branch' AND policyname='allow_anon_all_branch') THEN
    CREATE POLICY allow_anon_all_branch ON branch FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='employee' AND policyname='allow_anon_all_employee') THEN
    CREATE POLICY allow_anon_all_employee ON employee FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='password_reset_otp' AND policyname='allow_anon_all_otp') THEN
    CREATE POLICY allow_anon_all_otp ON password_reset_otp FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;

END $$;