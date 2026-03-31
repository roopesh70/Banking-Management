-- Seed Script for Employees & Admins
-- IMPORTANT: Make sure `rbac_schema.sql` is executed before running this!

-- 1. Insert an Admin
INSERT INTO admin (username, password_hash)
VALUES ('admin', crypt('Admin@123', gen_salt('bf', 12)))
ON CONFLICT (username) DO NOTHING;

-- 2. Insert 30 Employees Using a DO block
DO $$
DECLARE
    v_branch_main UUID;
    v_branch_north UUID;
    v_branch_south UUID;
    
    v_emp_id UUID;
    i INT;
    v_names text[] := ARRAY[
        'Rahul Sharma','Priya Singh','Amit Patel','Neha Gupta','Vikram Malhotra',
        'Anjali Desai','Rohit Kumar','Pooja Verma','Suresh Rao','Kavita Nair',
        'Arun Menon','Divya Krishnan','Rakesh Reddy','Swati Kulkarni','Manoj Joshi',
        'Sneha Patil','Rajesh Thakur','Meera Iyer','Sanjay Chakraborty','Nidhi Saxena',
        'Anil Das','Ritu Agarwal','Sunil Jain','Preeti Pandey','Karan Bhatia',
        'Jyoti Sharma','Vivek Mistry','Asha Naik','Tarun Soni','Geeta Shenoy'
    ];
    
    v_branch UUID;
    v_dept text;
    v_role text;
BEGIN
    -- Get or generate Branches
    SELECT branch_id INTO v_branch_main FROM branch LIMIT 1;
    IF v_branch_main IS NULL THEN
        INSERT INTO branch (branch_name, pincode, address) VALUES ('Main Branch', '100001', 'City Center') RETURNING branch_id INTO v_branch_main;
        INSERT INTO branch (branch_name, pincode, address) VALUES ('North Branch', '100002', 'North Avenue') RETURNING branch_id INTO v_branch_north;
        INSERT INTO branch (branch_name, pincode, address) VALUES ('South Branch', '100003', 'South Park') RETURNING branch_id INTO v_branch_south;
    ELSE
        -- Ensure we have identifiers
        v_branch_north := v_branch_main;
        v_branch_south := v_branch_main;
    END IF;
    
    FOR i IN 1..30 LOOP
        IF i % 3 = 0 THEN 
            v_branch := v_branch_main; v_dept := 'Operations'; 
        ELSIF i % 3 = 1 THEN 
            v_branch := v_branch_north; v_dept := 'Sales';
        ELSE 
            v_branch := v_branch_south; v_dept := 'Customer Service'; 
        END IF;
        
        IF i <= 3 THEN 
            v_role := 'Manager';
        ELSE 
            v_role := 'Staff'; 
        END IF;
        
        -- Insert Employee
        INSERT INTO employee (name, role, department, branch_id)
        VALUES (v_names[i], v_role, v_dept, v_branch)
        RETURNING employee_id INTO v_emp_id;
        
        -- Insert Login using username: emp1, emp2... password: Emp@123
        INSERT INTO employee_login (employee_id, username, password_hash)
        VALUES (v_emp_id, 'emp' || i, crypt('Emp@123', gen_salt('bf', 12)));
    END LOOP;
END $$;
