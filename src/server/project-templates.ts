import type { ProjectKind, PythonProfile } from "../project-types.js";

export function projectTemplate(
  kind: ProjectKind,
  directory: string,
  profile: PythonProfile = "minimal",
) {
  const files: Record<string, string> = {};
  let entry = "",
    install = "",
    start = "",
    check = "",
    dependencies = "",
    note = "",
    port: number | undefined;
  const pkg = (scripts: Record<string, string>, deps = {}, dev = {}) => {
    files["package.json"] =
      JSON.stringify(
        {
          name: "my-learning-project",
          version: "0.1.0",
          private: true,
          type: "module",
          scripts,
          dependencies: deps,
          devDependencies: dev,
        },
        null,
        2,
      ) + "\n";
    files[".gitignore"] = "node_modules/\ndist/\n.next/\n.env\n.env.*\n";
    install = `npm --prefix ${directory} install`;
    start = `npm --prefix ${directory} run dev`;
    check = `npm --prefix ${directory} run check`;
    note =
      "Install Node.js 22.12+ and npm. Review package.json before installing dependencies. Builds and type checks run from Project console.";
  };
  const tsconfig = {
    compilerOptions: {
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      strict: true,
      noEmit: true,
      allowImportingTsExtensions: true,
      rewriteRelativeImportExtensions: true,
      skipLibCheck: true,
    },
    include: ["src"],
  };
  if (kind === "react" || kind === "react-ts") {
    const ts = kind === "react-ts";
    pkg(
      {
        dev: "vite --host 127.0.0.1",
        build: ts ? "tsc --noEmit && vite build" : "vite build",
        check: ts ? "tsc --noEmit" : "vite build",
      },
      { react: "19.3.0", "react-dom": "19.3.0" },
      {
        vite: "8.3.4",
        ...(ts
          ? {
              typescript: "7.0.2",
              "@types/react": "^19.0.0",
              "@types/react-dom": "^19.0.0",
            }
          : {}),
      },
    );
    entry = `src/main.${ts ? "tsx" : "jsx"}`;
    files["index.html"] =
      `<!doctype html>\n<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>My learning project</title></head><body><div id="root"></div><script type="module" src="/${entry}"></script></body></html>\n`;
    files[entry] =
      `import React from "react";\nimport { createRoot } from "react-dom/client";\nimport "./style.css";\n\nfunction App() {\n  // Your brief and implementation belong here.\n  return <main><h1>My learning project</h1><p>Choose one useful feature and build it yourself.</p></main>;\n}\n\ncreateRoot(document.getElementById("root")${ts ? "!" : ""}).render(<App />);\n`;
    files["src/style.css"] =
      "body { margin: 0; font-family: system-ui, sans-serif; }\nmain { max-width: 800px; margin: 60px auto; padding: 24px; }\n";
    if (ts)
      files["src/vite-env.d.ts"] = '/// <reference types="vite/client" />\n';
    if (ts)
      files["tsconfig.json"] =
        JSON.stringify(
          {
            compilerOptions: {
              target: "ES2022",
              lib: ["ES2022", "DOM"],
              module: "ESNext",
              moduleResolution: "Bundler",
              jsx: "react-jsx",
              strict: true,
              noEmit: true,
              skipLibCheck: true,
            },
            include: ["src"],
          },
          null,
          2,
        ) + "\n";
    port = 5173;
  } else if (kind === "next") {
    pkg(
      {
        dev: "next dev --hostname 127.0.0.1",
        build: "next build",
        start: "next start --hostname 127.0.0.1",
        check: "tsc --noEmit",
      },
      { next: "16.4.0", react: "19.3.0", "react-dom": "19.3.0" },
      {
        typescript: "7.0.2",
        "@types/node": "^24.0.0",
        "@types/react": "^19.0.0",
        "@types/react-dom": "^19.0.0",
      },
    );
    entry = "app/page.tsx";
    files[entry] =
      "export default function Page() {\n  // Implement your own useful feature from the brief.\n  return <main><h1>My learning project</h1><p>Build one behavior and test it.</p></main>;\n}\n";
    files["app/layout.tsx"] =
      'import type { ReactNode } from "react";\nimport "./globals.css";\nexport default function Layout({ children }: { children: ReactNode }) {\n  return <html lang="en"><body>{children}</body></html>;\n}\n';
    files["app/globals.css"] =
      "body { font-family: system-ui, sans-serif; margin: 0; }\nmain { max-width: 800px; margin: 60px auto; padding: 24px; }\n";
    files["app/styles.d.ts"] = 'declare module "*.css" {}\n';
    files["tsconfig.json"] =
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2017",
            lib: ["dom", "dom.iterable", "esnext"],
            allowJs: true,
            skipLibCheck: true,
            strict: true,
            noEmit: true,
            esModuleInterop: true,
            module: "esnext",
            moduleResolution: "bundler",
            resolveJsonModule: true,
            isolatedModules: true,
            jsx: "preserve",
            incremental: true,
            plugins: [{ name: "next" }],
          },
          include: [
            "next-env.d.ts",
            "**/*.ts",
            "**/*.tsx",
            ".next/types/**/*.ts",
            ".next/dev/types/**/*.ts",
          ],
          exclude: ["node_modules"],
        },
        null,
        2,
      ) + "\n";
    files["next-env.d.ts"] =
      '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n';
    port = 3000;
  } else if (kind === "node" || kind === "typescript") {
    const ts = kind === "typescript";
    entry = `src/main.${ts ? "ts" : "mjs"}`;
    pkg(
      {
        dev: ts ? `tsx ${entry}` : `node ${entry}`,
        check: ts ? "tsc --noEmit" : `node --check ${entry}`,
        test: "node --test",
      },
      {},
      ts
        ? { typescript: "7.0.2", tsx: "4.23.15", "@types/node": "^24.0.0" }
        : {},
    );
    files[entry] =
      `// Build one useful feature from your brief.\n${ts ? 'const message: string = "My learning project";' : 'const message = "My learning project";'}\nconsole.log(message);\n`;
    if (ts) files["tsconfig.json"] = JSON.stringify(tsconfig, null, 2) + "\n";
    note =
      "Install Node.js 24+ and npm. The TypeScript project uses tsx for execution (including enums) and tsc for type checks. Run saved file uses Node's erasable syntax support; use Start project for transformations and Check/build project for type checking. JSX/TSX web apps use React/Next.js starters. Decorators and path aliases need your course's project configuration.";
  } else if (kind === "python") {
    entry = "main.py";
    const packages: Record<PythonProfile, string> = {
      minimal: "",
      data: "numpy\npandas\n",
      api: "fastapi\nuvicorn\n",
      web: "flask\n",
      ml: "numpy\npandas\nscikit-learn\n",
      torch: "torch\n",
    };
    files[entry] =
      '# Build one useful feature from your project brief.\nif __name__ == "__main__":\n    print("My learning project")\n';
    files["requirements.txt"] =
      "# Review dependencies and pin versions after validating your environment.\n" +
      packages[profile];
    files[".gitignore"] = ".venv/\n__pycache__/\n.env\n.env.*\n";
    install = `python -m venv ${directory}/.venv`;
    // This profile is resolved to the nearest project environment by ProjectRuntime.
    dependencies = `python -m pip install -r ${directory}/requirements.txt`;
    start = `python ${directory}/${entry}`;
    check = `python -m py_compile ${directory}/${entry}`;
    note =
      "Prepare environment first, then install requirements. OutClass selects this project's .venv for saved-file runs and these commands. Any compatible Python package can be listed; native, GPU, Python-version and platform prerequisites still apply. Packages are not bundled or installed automatically.";
  } else {
    const cpp = kind === "cpp";
    entry = cpp ? "main.cpp" : "main.c";
    files[entry] = cpp
      ? '#include <iostream>\n\nint main() {\n    // Build one useful feature from your brief.\n    std::cout << "My learning project\\n";\n    return 0;\n}\n'
      : '#include <stdio.h>\n\nint main(void) {\n    /* Build one useful feature from your brief. */\n    puts("My learning project");\n    return 0;\n}\n';
    files["CMakeLists.txt"] =
      `cmake_minimum_required(VERSION 3.20)\nproject(my_learning_project LANGUAGES ${cpp ? "CXX" : "C"})\nset(CMAKE_${cpp ? "CXX" : "C"}_STANDARD ${cpp ? "17" : "11"})\nset(CMAKE_${cpp ? "CXX" : "C"}_STANDARD_REQUIRED ON)\nadd_executable(learning_app ${entry})\n`;
    files[".gitignore"] = "build/\n*.exe\n*.o\n*.obj\n.env\n.env.*\n";
    install = `cmake -S ${directory} -B ${directory}/build`;
    start =
      process.platform === "win32"
        ? `& ${directory}/build/learning_app.exe`
        : `./${directory}/build/learning_app`;
    check = `cmake --build ${directory}/build`;
    note =
      "Run saved file compiles a single C11/C++17 entry with GCC/G++ or Clang on PATH, then runs it within ten seconds. Use CMake and Project console for multi-file projects. Windows MSVC builds may place the executable in build/Debug and require a Developer environment.";
  }
  files["README.md"] =
    `# My learning project\n\n## User need\nWrite the problem you want to solve.\n\n## First useful feature\nDescribe one behavior, its inputs, and its acceptance criteria.\n\n## Setup\n${note}\n\nPrepare: \`${install}\`\n${dependencies ? `\nInstall packages: \`${dependencies}\`\n` : ""}\nCheck/build: \`${check}\`\n\nStart: \`${start}\`\n\n## Validation\nWrite the checks you actually ran and their results.\n\n## Tradeoffs and next steps\nExplain a decision and a changed requirement you will try.\n\nOutClass supplied only infrastructure and this outline; you implement the project.\n`;
  return {
    files,
    entry: `${directory}/${entry}`,
    install,
    start,
    check,
    dependencies,
    note,
    port,
  };
}
