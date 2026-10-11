import { afterEach, beforeEach, expect, it } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Store } from "../src/server/store";
import { Application } from "../src/server/application";
import { Workspace } from "../src/server/workspace";
import { ProjectRuntime } from "../src/server/project-runtime";
import { Practice } from "../src/server/practice";
import { nativeCompiler, localTool } from "../src/server/native-runtime";
import { projectKinds, practiceLanguage } from "../src/project-types";

let folder: string,
  store: Store,
  app: Application,
  workspace: Workspace,
  runtime: ProjectRuntime,
  practice: Practice,
  id: string;
beforeEach(async () => {
  folder = await mkdtemp(path.join(tmpdir(), "outclass-languages-"));
  store = new Store(path.join(folder, "data"));
  app = new Application(store);
  workspace = new Workspace(app);
  runtime = new ProjectRuntime(app, workspace);
  practice = new Practice(app, workspace);
  await app.setup(path.join(folder, "history"), false);
  app.observe({
    eventId: "course",
    courseId: "course",
    title: "TypeScript functions",
    url: "https://www.udemy.com/course/course/learn/lecture/1",
    lessons: [
      {
        id: "1",
        title: "Functions and validation",
        section: "Basics",
        order: 0,
      },
    ],
  });
  await app.bindProject("course", "project");
  await app.start("course", "1");
  id = store.state().session!.id;
});
afterEach(async () => {
  runtime.stopAll();
  await workspace.stopAll();
  await new Promise((r) => setTimeout(r, 400));
  store.close();
  await rm(folder, { recursive: true, force: true });
});
async function waitFor(predicate: () => boolean) {
  for (let i = 0; i < 500; i++) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("Local tool did not finish");
}

it("runs typed files and imports, records dependency freshness, and rejects JSX as a single-file script", async () => {
  await workspace.save(
    id,
    "src/value.ts",
    "export const value: number = 42;",
    null,
  );
  await workspace.save(
    id,
    "src/main.ts",
    "import {value} from './value.ts'; const label: string='Answer'; console.log(label,value);",
    null,
  );
  const run = await workspace.run(id, "src/main.ts");
  expect(run.exitCode).toBe(0);
  expect(run.output).toContain("Answer 42");
  const value = await workspace.read(id, "src/value.ts");
  await workspace.save(
    id,
    value.path,
    "export const value: number = 43;",
    value.version,
  );
  expect((await workspace.runContext(id, run.run.id)).stale).toBe(true);
  await workspace.save(
    id,
    "src/App.tsx",
    "export default () => <main>Hello</main>;",
    null,
  );
  await expect(workspace.run(id, "src/App.tsx")).rejects.toThrow("dev server");
});
it("offers typed practice and verifies behavior without claiming execution is a type check", async () => {
  const task = await practice.start("course", "typescript-validation");
  expect(task.path.endsWith(".ts")).toBe(true);
  expect((await practice.check(task.id, id)).attempts[0].passed).toBe(false);
  const file = await workspace.read(id, task.path);
  await workspace.save(
    id,
    task.path,
    "export function discountedPrice(price: number, discount: number) { if(price<0||discount<0||discount>100) throw Error('invalid'); return Math.round(price*(1-discount/100)*100)/100; }",
    file.version,
  );
  expect((await practice.check(task.id, id)).attempts[0].passed).toBe(true);
  const transfer = await practice.start(
    "course",
    "typescript-validation-transfer",
    undefined,
    task.id,
  );
  expect(transfer.transferOf).toBe(task.id);
  expect((await practice.check(transfer.id, id)).attempts[0].passed).toBe(
    false,
  );
});
it("creates all requested projects with explicit setup/check commands and isolated Python package choices", async () => {
  const directories = new Set<string>();
  for (const kind of projectKinds) {
    const project = await runtime.scaffold(id, kind, "data");
    directories.add(project.directory);
    expect((await workspace.read(id, project.entry)).content).toBeTruthy();
    expect(project.check).toBeTruthy();
    expect(project.note).toBeTruthy();
    if (kind === "python") {
      expect(project.dependencies).toContain("pip install -r");
      expect(
        (await workspace.read(id, `${project.directory}/requirements.txt`))
          .content,
      ).toContain("pandas");
    }
    if (kind === "next") expect(project.port).toBe(3000);
    if (kind === "react-ts")
      expect(
        (await workspace.read(id, `${project.directory}/tsconfig.json`))
          .content,
      ).toContain("strict");
  }
  expect(directories.size).toBe(projectKinds.length);
  for (const [title, file, language] of [
    ["React", "app.tsx", "typescript"],
    ["NumPy data science", "", "python"],
    ["C++ pointers", "", "cpp"],
    ["C programming", "", "c"],
    ["Node.js", "", "javascript"],
  ])
    expect(practiceLanguage(title, file)).toBe(language);
});
it("uses the nearest Python venv for pip, project commands and saved-file runs", async () => {
  const project = await runtime.scaffold(id, "python");
  const environment = await runtime.start(id, project.install);
  await waitFor(
    () =>
      runtime.status(id).find((r) => r.id === environment.id)?.state !==
      "running",
  );
  expect(
    runtime.status(id).find((r) => r.id === environment.id)?.exitCode,
  ).toBe(0);
  const root = store.state().session!.workspace;
  const interpreter = await workspace.pythonRuntime(root, project.entry);
  expect(interpreter).toContain(project.directory.replaceAll("/", path.sep));
  const file = await workspace.read(id, project.entry);
  await workspace.save(
    id,
    project.entry,
    "import sys; print(sys.prefix); import pip; print('pip ready')",
    file.version,
  );
  const result = await workspace.run(id, project.entry);
  expect(result.output).toContain(path.join(root, project.directory, ".venv"));
  expect(result.output).toContain("pip ready");
  // Install a real wheel without a network dependency and import it from the selected venv.
  const wheel = `${project.directory}/support_library-0.1-py3-none-any.whl`;
  const bootstrap = `${project.directory}/prepare_wheel.py`;
  await workspace.save(
    id,
    bootstrap,
    `import zipfile\nwith zipfile.ZipFile(${JSON.stringify(wheel)}, 'w') as z:\n    z.writestr('support_library/__init__.py', 'VALUE = 73\\n')\n    z.writestr('support_library-0.1.dist-info/METADATA', 'Metadata-Version: 2.1\\nName: support-library\\nVersion: 0.1\\n')\n    z.writestr('support_library-0.1.dist-info/WHEEL', 'Wheel-Version: 1.0\\nGenerator: OutClass-test\\nRoot-Is-Purelib: true\\nTag: py3-none-any\\n')\n    z.writestr('support_library-0.1.dist-info/RECORD', '')\n`,
    null,
  );
  expect((await workspace.run(id, bootstrap)).exitCode).toBe(0);
  const requirements = await workspace.read(
    id,
    `${project.directory}/requirements.txt`,
  );
  await workspace.save(
    id,
    requirements.path,
    `./${wheel}\n`,
    requirements.version,
  );
  const install = await runtime.start(id, project.dependencies);
  await waitFor(
    () =>
      runtime.status(id).find((r) => r.id === install.id)?.state !== "running",
  );
  expect(runtime.status(id).find((r) => r.id === install.id)?.exitCode).toBe(0);
  const installed = await workspace.read(id, project.entry);
  await workspace.save(
    id,
    project.entry,
    "from support_library import VALUE; print('Installed package',VALUE)",
    installed.version,
  );
  expect((await workspace.run(id, project.entry)).output).toContain(
    "Installed package 73",
  );
}, 60000);

it.runIf(!!(await nativeCompiler(true)))(
  "compiles real C++ with local headers, records compiler errors and accepts bounded stdin",
  async () => {
    await workspace.save(
      id,
      "native/value.hpp",
      "#pragma once\nconstexpr int answer = 42;",
      null,
    );
    await workspace.save(
      id,
      "native/main.cpp",
      '#include "value.hpp"\n#include <iostream>\nint main(){ std::cout << "Name: " << std::flush; std::string name; std::getline(std::cin,name); std::cout << name << " " << answer << "\\n"; }',
      null,
    );
    const running = workspace.run(id, "native/main.cpp");
    await waitFor(
      () => workspace.runStatus(id)?.output.includes("Name:") || false,
    );
    workspace.input(id, "Maya");
    const result = await running;
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("Maya 42");
    const file = await workspace.read(id, "native/main.cpp");
    await workspace.save(id, file.path, "int main( {", file.version);
    const failed = await workspace.run(id, file.path);
    expect(failed.exitCode).not.toBe(0);
    expect(failed.output).toContain("error");
    expect(
      (await workspace.list(id)).files.some((f) => /\.exe$/.test(f.path)),
    ).toBe(false);
  },
  60000,
);
it.runIf(!!(await nativeCompiler(false)))(
  "checks native practice and its changed requirement against compiled behavior",
  async () => {
    const task = await practice.start("course", "c-validation");
    expect((await practice.check(task.id, id)).attempts[0].passed).toBe(false);
    const file = await workspace.read(id, task.path);
    await workspace.save(
      id,
      task.path,
      "#include <math.h>\ndouble discounted_price(double p,double d){if(p<0||d<0||d>100)return -1; return p*(1-d/100);}",
      file.version,
    );
    expect((await practice.check(task.id, id)).attempts[0].passed).toBe(true);
    const transfer = await practice.start(
        "course",
        "c-validation-transfer",
        undefined,
        task.id,
      ),
      next = await workspace.read(id, transfer.path);
    await workspace.save(
      id,
      next.path,
      "#include <math.h>\ndouble discounted_price(double p,double d){if(!isfinite(p)||!isfinite(d)||p<0||d<0||d>100)return -1; return p*(1-d/100);}",
      next.version,
    );
    expect((await practice.check(transfer.id, id)).attempts[0].passed).toBe(
      true,
    );
  },
  30000,
);
it.runIf(
  !!(await nativeCompiler(false)) &&
    (await localTool("cmake")) &&
    (await localTool("ninja")),
)(
  "configures and builds a genuine multi-file C project from its generated console commands",
  async () => {
    const project = await runtime.scaffold(id, "c");
    const main = await workspace.read(id, project.entry);
    await workspace.save(
      id,
      project.entry,
      '#include <stdio.h>\n#include "feature.h"\nint main(void){printf("Multi-file result %d\\n", answer()); return 0;}\n',
      main.version,
    );
    await workspace.save(
      id,
      `${project.directory}/feature.h`,
      "int answer(void);\n",
      null,
    );
    await workspace.save(
      id,
      `${project.directory}/feature.c`,
      "int answer(void){return 42;}\n",
      null,
    );
    const cmake = await workspace.read(
      id,
      `${project.directory}/CMakeLists.txt`,
    );
    await workspace.save(
      id,
      cmake.path,
      cmake.content.replace("main.c)", "main.c feature.c)"),
      cmake.version,
    );
    for (const command of [project.install, project.check, project.start]) {
      const job = await runtime.start(id, command);
      await waitFor(
        () =>
          runtime.status(id).find((r) => r.id === job.id)?.state !== "running",
      );
      const result = runtime.status(id).find((r) => r.id === job.id)!;
      expect(result.exitCode, result.output).toBe(0);
    }
    expect(runtime.status(id)[0].output).toContain("Multi-file result 42");
  },
  60000,
);
