export type SkillSource = "explicit" | "inferred";
export type SkillImportance = "required" | "preferred";

export interface Database {
  __InternalSupabase: { PostgrestVersion: "13" };
  public: {
    Tables: {
      skills: {
        Row: { id: string; name: string; category: string };
        Insert: { id: string; name: string; category: string };
        Update: Partial<{ id: string; name: string; category: string }>;
        Relationships: [];
      };
      employees: {
        Row: {
          id: string;
          name: string;
          job_title: string;
          department: string;
          bio: string;
        };
        Insert: {
          id: string;
          name: string;
          job_title: string;
          department: string;
          bio: string;
        };
        Update: Partial<{
          id: string;
          name: string;
          job_title: string;
          department: string;
          bio: string;
        }>;
        Relationships: [];
      };
      employee_skills: {
        Row: {
          employee_id: string;
          skill_id: string;
          source: SkillSource;
          evidence: string | null;
          proficiency: number;
          linked_to: string[];
        };
        Insert: {
          employee_id: string;
          skill_id: string;
          source: SkillSource;
          evidence?: string | null;
          proficiency: number;
          linked_to?: string[];
        };
        Update: Partial<{
          employee_id: string;
          skill_id: string;
          source: SkillSource;
          evidence: string | null;
          proficiency: number;
          linked_to: string[];
        }>;
        Relationships: [];
      };
      roles: {
        Row: { id: string; title: string; team: string; description: string };
        Insert: { id: string; title: string; team: string; description: string };
        Update: Partial<{
          id: string;
          title: string;
          team: string;
          description: string;
        }>;
        Relationships: [];
      };
      role_skills: {
        Row: {
          role_id: string;
          skill_id: string;
          importance: SkillImportance;
        };
        Insert: {
          role_id: string;
          skill_id: string;
          importance: SkillImportance;
        };
        Update: Partial<{
          role_id: string;
          skill_id: string;
          importance: SkillImportance;
        }>;
        Relationships: [];
      };
      courses: {
        Row: { id: string; title: string; hours: number; skill_id: string };
        Insert: { id: string; title: string; hours: number; skill_id: string };
        Update: Partial<{
          id: string;
          title: string;
          hours: number;
          skill_id: string;
        }>;
        Relationships: [];
      };
      llm_cache: {
        Row: { hash: string; json: unknown; created_at: string };
        Insert: { hash: string; json: unknown; created_at?: string };
        Update: Partial<{ hash: string; json: unknown; created_at: string }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
