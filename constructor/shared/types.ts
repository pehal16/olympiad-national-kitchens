export type Json = Record<string, any>;
export interface Question extends Json {
  id: string;
  type: string;
  title: string;
  prompt: string;
  maxScore: number;
  seconds: number;
  required: boolean;
  grading: string;
  partialCredit: boolean;
  shuffle: boolean;
  config: Json;
  key: Json;
  rubric: Json[];
  media: Json[];
}
export interface Round extends Json {
  id: string;
  title: string;
  instructions: string;
  seconds: number;
  questions: Question[];
  transition: string;
  threshold: number;
}
export interface Project extends Json {
  id: string;
  title: string;
  kind: string;
  revision: number;
  rounds: Round[];
  narrator: Json;
  theme: Json;
  awardRules: Json[];
}
export interface User {
  id: string;
  name: string;
  login: string;
  role: string;
  permissions: Json;
  active: boolean;
}
export interface AwardTemplate extends Json {
  id: string;
  title: string;
  width: number;
  height: number;
  elements: Json[];
}
