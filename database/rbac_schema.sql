-- RBAC Schema Extensions

-- 1. Admin Table
CREATE TABLE IF NOT EXISTS admin (
    admin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Employee Login Table (for Managers/Staff)
CREATE TABLE IF NOT EXISTS employee_login (
    login_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID UNIQUE REFERENCES employee(employee_id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    failed_attempts INT DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE
);

-- 3. Authenticate Admin RPC
CREATE OR REPLACE FUNCTION authenticate_admin(p_username VARCHAR, p_password VARCHAR, p_ip VARCHAR)
RETURNS JSONB AS $$
DECLARE
    v_admin_record admin%ROWTYPE;
BEGIN
    SELECT * INTO v_admin_record FROM admin WHERE username = p_username;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid Admin Credentials');
    END IF;
    
    IF v_admin_record.password_hash = crypt(p_password, v_admin_record.password_hash) THEN
        INSERT INTO audit_logs (username, event_type, ip_address) VALUES (p_username, 'ADMIN_LOGIN_SUCCESS', p_ip::INET);
        RETURN jsonb_build_object('success', true, 'user_id', v_admin_record.admin_id, 'role', 'admin');
    ELSE
        INSERT INTO audit_logs (username, event_type, ip_address) VALUES (p_username, 'ADMIN_LOGIN_FAILED', p_ip::INET);
        RETURN jsonb_build_object('success', false, 'message', 'Invalid Admin Credentials');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Authenticate Employee RPC
CREATE OR REPLACE FUNCTION authenticate_employee(p_username VARCHAR, p_password VARCHAR, p_ip VARCHAR)
RETURNS JSONB AS $$
DECLARE
    v_login_record employee_login%ROWTYPE;
    v_employee_record employee%ROWTYPE;
BEGIN
    SELECT * INTO v_login_record FROM employee_login WHERE username = p_username;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid Username or Password');
    END IF;
    
    IF v_login_record.locked_until > NOW() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Account locked temporarily.');
    END IF;
    
    IF v_login_record.password_hash = crypt(p_password, v_login_record.password_hash) THEN
        -- Get Employee Details
        SELECT * INTO v_employee_record FROM employee WHERE employee_id = v_login_record.employee_id;
        
        UPDATE employee_login SET failed_attempts = 0, locked_until = NULL, last_login = NOW() WHERE login_id = v_login_record.login_id;
        INSERT INTO audit_logs (username, event_type, ip_address) VALUES (p_username, 'EMP_LOGIN_SUCCESS', p_ip::INET);
        
        RETURN jsonb_build_object(
            'success', true, 
            'user_id', v_employee_record.employee_id,
            'role', 'manager',
            'department', v_employee_record.department,
            'branch_id', v_employee_record.branch_id
        );
    ELSE
        UPDATE employee_login SET failed_attempts = failed_attempts + 1 WHERE login_id = v_login_record.login_id;
        INSERT INTO audit_logs (username, event_type, ip_address) VALUES (p_username, 'EMP_LOGIN_FAILED', p_ip::INET);
        
        IF (v_login_record.failed_attempts + 1) >= 5 THEN
            UPDATE employee_login SET locked_until = NOW() + INTERVAL '15 minutes' WHERE login_id = v_login_record.login_id;
        END IF;
        
        RETURN jsonb_build_object('success', false, 'message', 'Invalid Username or Password');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
