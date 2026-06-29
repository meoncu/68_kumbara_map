export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      firms: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          name: string;
          type: string;
          representative_name: string | null;
          representative_phone: string | null;
          alternative_phone: string | null;
          whatsapp: string | null;
          email: string | null;
          address: string | null;
          city: string;
          district: string;
          neighborhood: string;
          street: string | null;
          building_no: string | null;
          apartment_no: string | null;
          latitude: number | null;
          longitude: number | null;
          location: any | null;
          description: string | null;
          status: 'active' | 'inactive';
          tags: string[] | null;
          notes: string | null;
          custom_fields: Json | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          name: string;
          type?: string;
          representative_name?: string | null;
          representative_phone?: string | null;
          alternative_phone?: string | null;
          whatsapp?: string | null;
          email?: string | null;
          address?: string | null;
          city: string;
          district: string;
          neighborhood: string;
          street?: string | null;
          building_no?: string | null;
          apartment_no?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location?: any | null;
          description?: string | null;
          status?: 'active' | 'inactive';
          tags?: string[] | null;
          notes?: string | null;
          custom_fields?: Json | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          name?: string;
          type?: string;
          representative_name?: string | null;
          representative_phone?: string | null;
          alternative_phone?: string | null;
          whatsapp?: string | null;
          email?: string | null;
          address?: string | null;
          city?: string;
          district?: string;
          neighborhood?: string;
          street?: string | null;
          building_no?: string | null;
          apartment_no?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location?: any | null;
          description?: string | null;
          status?: 'active' | 'inactive';
          tags?: string[] | null;
          notes?: string | null;
          custom_fields?: Json | null;
        };
      };
      piggy_banks: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          number: string;
          qr_code: string | null;
          barcode: string | null;
          type: string;
          placement_date: string;
          last_replacement_date: string | null;
          next_replacement_date: string;
          period_days: number;
          status: 'new' | 'this_month' | 'this_week' | 'overdue' | 'collected' | 'problematic' | 'inactive';
          total_collections: number;
          total_donation: number;
          last_donation: number | null;
          notes: string | null;
          custom_fields: Json | null;
          firm_id: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          number: string;
          qr_code?: string | null;
          barcode?: string | null;
          type?: string;
          placement_date: string;
          last_replacement_date?: string | null;
          next_replacement_date: string;
          period_days?: number;
          status?: 'new' | 'this_month' | 'this_week' | 'overdue' | 'collected' | 'problematic' | 'inactive';
          total_collections?: number;
          total_donation?: number;
          last_donation?: number | null;
          notes?: string | null;
          custom_fields?: Json | null;
          firm_id?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          number?: string;
          qr_code?: string | null;
          barcode?: string | null;
          type?: string;
          placement_date?: string;
          last_replacement_date?: string | null;
          next_replacement_date?: string;
          period_days?: number;
          status?: 'new' | 'this_month' | 'this_week' | 'overdue' | 'collected' | 'problematic' | 'inactive';
          total_collections?: number;
          total_donation?: number;
          last_donation?: number | null;
          notes?: string | null;
          custom_fields?: Json | null;
          firm_id?: string | null;
        };
      };
      teams: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          name: string;
          color: string;
          vehicle_info: string | null;
          status: 'active' | 'inactive';
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name: string;
          color?: string;
          vehicle_info?: string | null;
          status?: 'active' | 'inactive';
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name?: string;
          color?: string;
          vehicle_info?: string | null;
          status?: 'active' | 'inactive';
        };
      };
      team_members: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          team_id: string;
          name: string;
          phone: string | null;
          role: string;
          photo_url: string | null;
          active: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          team_id: string;
          name: string;
          phone?: string | null;
          role?: string;
          photo_url?: string | null;
          active?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          team_id?: string;
          name?: string;
          phone?: string | null;
          role?: string;
          photo_url?: string | null;
          active?: boolean;
        };
      };
      tasks: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          date: string;
          team_id: string;
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          route: Json | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          date: string;
          team_id: string;
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          route?: Json | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          date?: string;
          team_id?: string;
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          route?: Json | null;
          notes?: string | null;
        };
      };
      task_items: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          task_id: string;
          piggy_bank_id: string;
          firm_id: string;
          order: number;
          status: 'pending' | 'in_progress' | 'completed' | 'skipped';
          old_piggy_bank_taken: boolean;
          new_piggy_bank_placed: boolean;
          photos: string[] | null;
          notes: string | null;
          signature: string | null;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          task_id: string;
          piggy_bank_id: string;
          firm_id: string;
          order?: number;
          status?: 'pending' | 'in_progress' | 'completed' | 'skipped';
          old_piggy_bank_taken?: boolean;
          new_piggy_bank_placed?: boolean;
          photos?: string[] | null;
          notes?: string | null;
          signature?: string | null;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          task_id?: string;
          piggy_bank_id?: string;
          firm_id?: string;
          order?: number;
          status?: 'pending' | 'in_progress' | 'completed' | 'skipped';
          old_piggy_bank_taken?: boolean;
          new_piggy_bank_placed?: boolean;
          photos?: string[] | null;
          notes?: string | null;
          signature?: string | null;
          completed_at?: string | null;
        };
      };
      custom_field_definitions: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          type: 'text' | 'number' | 'date' | 'boolean' | 'select';
          entity_type: 'firm' | 'piggy_bank';
          options: string[] | null;
          required: boolean;
          active: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          type?: 'text' | 'number' | 'date' | 'boolean' | 'select';
          entity_type: 'firm' | 'piggy_bank';
          options?: string[] | null;
          required?: boolean;
          active?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          type?: 'text' | 'number' | 'date' | 'boolean' | 'select';
          entity_type?: 'firm' | 'piggy_bank';
          options?: string[] | null;
          required?: boolean;
          active?: boolean;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          created_at: string;
          user_id: string | null;
          table_name: string;
          record_id: string | null;
          action: 'insert' | 'update' | 'delete';
          old_data: Json | null;
          new_data: Json | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id?: string | null;
          table_name: string;
          record_id?: string | null;
          action: 'insert' | 'update' | 'delete';
          old_data?: Json | null;
          new_data?: Json | null;
        };
      };
    };
  };
}
