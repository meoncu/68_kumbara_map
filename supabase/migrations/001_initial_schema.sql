-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create audit log function
CREATE OR REPLACE FUNCTION public.handle_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, 'insert', NULL, row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, 'update', row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data)
        VALUES (TG_TABLE_NAME, OLD.id, 'delete', row_to_json(OLD), NULL);
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Firms table
CREATE TABLE IF NOT EXISTS public.firms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ,
    name TEXT NOT NULL,
    type TEXT,
    representative_name TEXT,
    representative_phone TEXT,
    alternative_phone TEXT,
    whatsapp TEXT,
    email TEXT,
    address TEXT,
    city TEXT NOT NULL,
    district TEXT NOT NULL,
    neighborhood TEXT NOT NULL,
    street TEXT,
    building_no TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location GEOGRAPHY(POINT, 4326),
    description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    tags TEXT[],
    notes TEXT,
    custom_fields JSONB
);

-- Spatial index for firms location
CREATE INDEX IF NOT EXISTS firms_location_idx ON public.firms USING GIST(location);

-- Indexes for firms search
CREATE INDEX IF NOT EXISTS firms_name_idx ON public.firms USING GIN (to_tsvector('turkish', name));
CREATE INDEX IF NOT EXISTS firms_city_idx ON public.firms (city);
CREATE INDEX IF NOT EXISTS firms_district_idx ON public.firms (district);
CREATE INDEX IF NOT EXISTS firms_neighborhood_idx ON public.firms (neighborhood);
CREATE INDEX IF NOT EXISTS firms_status_idx ON public.firms (status);

-- Piggy banks table
CREATE TABLE IF NOT EXISTS public.piggy_banks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ,
    number TEXT NOT NULL UNIQUE,
    qr_code TEXT,
    barcode TEXT,
    type TEXT DEFAULT 'standard',
    placement_date TIMESTAMPTZ NOT NULL,
    last_replacement_date TIMESTAMPTZ,
    next_replacement_date TIMESTAMPTZ NOT NULL,
    period_days INTEGER DEFAULT 90 NOT NULL,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'this_month', 'this_week', 'overdue', 'collected', 'problematic', 'inactive')),
    total_collections INTEGER DEFAULT 0 NOT NULL,
    total_donation NUMERIC DEFAULT 0 NOT NULL,
    last_donation NUMERIC,
    notes TEXT,
    custom_fields JSONB,
    firm_id UUID REFERENCES public.firms(id) ON DELETE SET NULL
);

-- Indexes for piggy banks
CREATE INDEX IF NOT EXISTS piggy_banks_firm_id_idx ON public.piggy_banks (firm_id);
CREATE INDEX IF NOT EXISTS piggy_banks_number_idx ON public.piggy_banks (number);
CREATE INDEX IF NOT EXISTS piggy_banks_status_idx ON public.piggy_banks (status);
CREATE INDEX IF NOT EXISTS piggy_banks_next_replacement_date_idx ON public.piggy_banks (next_replacement_date);

-- Teams table
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    vehicle_info TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);

-- Team members table
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'member',
    photo_url TEXT,
    active BOOLEAN DEFAULT TRUE NOT NULL
);

CREATE INDEX IF NOT EXISTS team_members_team_id_idx ON public.team_members (team_id);

-- Tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    route JSONB,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS tasks_date_idx ON public.tasks (date);
CREATE INDEX IF NOT EXISTS tasks_team_id_idx ON public.tasks (team_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON public.tasks (status);

-- Task items table
CREATE TABLE IF NOT EXISTS public.task_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    piggy_bank_id UUID REFERENCES public.piggy_banks(id) ON DELETE CASCADE NOT NULL,
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE NOT NULL,
    order INTEGER DEFAULT 0 NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
    old_piggy_bank_taken BOOLEAN DEFAULT FALSE NOT NULL,
    new_piggy_bank_placed BOOLEAN DEFAULT FALSE NOT NULL,
    photos TEXT[],
    notes TEXT,
    signature TEXT,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS task_items_task_id_idx ON public.task_items (task_id);
CREATE INDEX IF NOT EXISTS task_items_firm_id_idx ON public.task_items (firm_id);
CREATE INDEX IF NOT EXISTS task_items_piggy_bank_id_idx ON public.task_items (piggy_bank_id);

-- Custom field definitions table
CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'text' CHECK (type IN ('text', 'number', 'date', 'boolean', 'select')),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('firm', 'piggy_bank')),
    options TEXT[],
    required BOOLEAN DEFAULT FALSE NOT NULL,
    active BOOLEAN DEFAULT TRUE NOT NULL
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    user_id UUID,
    table_name TEXT NOT NULL,
    record_id UUID,
    action TEXT NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
    old_data JSONB,
    new_data JSONB
);

CREATE INDEX IF NOT EXISTS audit_logs_table_name_idx ON public.audit_logs (table_name);
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs (created_at);

-- Add triggers for updated_at
DO $$
DECLARE
    tables text[] := ARRAY['firms', 'piggy_banks', 'teams', 'team_members', 'tasks', 'task_items', 'custom_field_definitions'];
    tbl text;
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS handle_updated_at ON public.%I;
            CREATE TRIGGER handle_updated_at
            BEFORE UPDATE ON public.%I
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
        ', tbl, tbl);
    END LOOP;
END $$;

-- Add triggers for audit logs
DO $$
DECLARE
    tables text[] := ARRAY['firms', 'piggy_banks', 'teams', 'team_members', 'tasks', 'task_items', 'custom_field_definitions'];
    tbl text;
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS handle_audit_log ON public.%I;
            CREATE TRIGGER handle_audit_log
            AFTER INSERT OR UPDATE OR DELETE ON public.%I
            FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();
        ', tbl, tbl);
    END LOOP;
END $$;

-- Enable Row Level Security
ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.piggy_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for authenticated users" ON public.firms
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON public.firms
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON public.firms
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON public.piggy_banks
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON public.piggy_banks
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON public.piggy_banks
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON public.teams
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON public.team_members
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON public.tasks
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON public.task_items
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON public.custom_field_definitions
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON public.audit_logs
    FOR SELECT USING (auth.role() = 'authenticated');
