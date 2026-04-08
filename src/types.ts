export type ThreatLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ConfidenceLevel = "verified" | "unverified" | "rumor";
export type ConflictCategory = 
  | "military_strikes"
  | "proxy_activity"
  | "nuclear_program"
  | "diplomacy_sanctions"
  | "casualties_damage"
  | "naval_maritime"
  | "cyber_operations"
  | "refugee_humanitarian"
  | "geopolitical_alliances";

export interface BreakingEvent {
  headline: string;
  detail: string;
  category: ConflictCategory;
  source: string;
  source_url: string;
  timestamp: string;
  confidence: ConfidenceLevel;
}

export interface XPost {
  username: string;
  content: string;
  url: string;
  verified_account: boolean;
}

export interface ConflictData {
  situation_summary: string;
  threat_level: ThreatLevel;
  last_updated: string;
  breaking_events: BreakingEvent[];
  x_posts: XPost[];
  key_actors: string[];
  analyst_assessment: string;
  next_24h_watch: string;
}
