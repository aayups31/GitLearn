export const projectKinds = [
  "react",
  "react-ts",
  "node",
  "typescript",
  "next",
  "python",
  "c",
  "cpp",
] as const;
export type ProjectKind = (typeof projectKinds)[number];
export const projectLabels: Record<ProjectKind, string> = {
  react: "React · JavaScript",
  "react-ts": "React · TypeScript",
  node: "Node.js",
  typescript: "TypeScript · Node.js",
  next: "Next.js · TypeScript",
  python: "Python",
  c: "C",
  cpp: "C++",
};
export const pythonProfiles = [
  "minimal",
  "data",
  "api",
  "web",
  "ml",
  "torch",
] as const;
export type PythonProfile = (typeof pythonProfiles)[number];
export const pythonProfileLabels: Record<PythonProfile, string> = {
  minimal: "Choose my own packages",
  data: "NumPy + pandas",
  api: "FastAPI",
  web: "Flask",
  ml: "scikit-learn",
  torch: "PyTorch",
};
export const practiceLanguage = (title: string, file = "") => {
  if (/\.py$/i.test(file)) return "python";
  if (/\.(?:cpp|cc|cxx|hpp)$/i.test(file)) return "cpp";
  if (/\.c$/i.test(file)) return "c";
  if (/\.[cm]?tsx?$/i.test(file)) return "typescript";
  if (/\.[cm]?jsx?$/i.test(file)) return "javascript";
  if (
    /python|numpy|pandas|fastapi|flask|pytorch|tensorflow|scikit/i.test(title)
  )
    return "python";
  if (/c\+\+|\bcpp\b/i.test(title)) return "cpp";
  if (/\bc programming\b|\blearn c\b|\bc language\b/i.test(title)) return "c";
  if (/typescript|\btsx\b/i.test(title)) return "typescript";
  if (/javascript|react|node\.?js|next\.?js|\bjs\b/i.test(title))
    return "javascript";
};
