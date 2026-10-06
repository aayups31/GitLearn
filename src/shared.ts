import { z } from "zod";
export const lessonSchema = z.object({
  id: z.string().min(1).max(200),
  title: z.string().min(1).max(300),
  section: z.string().max(300).default("Lessons"),
  sectionId: z.string().max(200).optional(),
  order: z.number().int().min(0).default(0),
  completed: z.boolean().optional(),
});
export const observationSchema = z.object({
  eventId: z.string().min(1).max(200),
  courseId: z.string().min(1).max(200),
  title: z.string().min(1).max(300),
  url: z.string().url().max(2000),
  currentLessonId: z.string().max(200).optional(),
  lessons: z.array(lessonSchema).max(500).default([]),
});
export type Observation = z.infer<typeof observationSchema>;
export type Lesson = z.infer<typeof lessonSchema> & {
  path: string;
  archived?: boolean;
};
export interface Course {
  id: string;
  title: string;
  url: string;
  path: string;
  lessons: Lesson[];
  currentLessonId?: string;
  mirrored: boolean;
  observedAt: string;
}
export interface Session {
  id: string;
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  courseTitle: string;
  section: string;
  destination: string;
  workspace: string;
  startedAt: string;
  status: "active" | "paused";
  note: string;
}
export interface Checkpoint {
  id: string;
  sessionId: string;
  courseId: string;
  courseTitle: string;
  lessonTitle: string;
  timestamp: string;
  message: string;
  sha: string;
  files: string[];
  sync: "local" | "pending" | "synced";
}
export interface Settings {
  configured: boolean;
  repoPath: string;
  aiEnabled: boolean;
  remote: string;
}
export interface AppState {
  settings: Settings;
  courses: Course[];
  session: Session | null;
  checkpoints: Checkpoint[];
}
export interface Finding {
  path: string;
  kind: string;
}
export interface FrozenFile {
  path: string;
  content: string | null;
}
export interface Preview {
  id: string;
  sessionId: string;
  expectedHead: string;
  expectedBranch: string;
  treeId: string;
  fingerprint: string;
  files: FrozenFile[];
  changes: { path: string; status: string }[];
  diff: string;
  message: string;
  aiUsed: boolean;
  aiNotice?: string;
  createdAt: string;
}
export type PublicPreview = Omit<
  Preview,
  "files" | "treeId" | "expectedBranch"
>;
export interface Status extends AppState {
  hasApiKey: boolean;
  gitAvailable: boolean;
  ghAvailable: boolean;
  extensionConnected: boolean;
  sourceFiles: number;
}
