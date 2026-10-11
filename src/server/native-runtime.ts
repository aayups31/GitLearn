import { spawn } from "node:child_process";
import { UserError } from "./safety.js";

export async function nativeCompiler(
  cpp: boolean,
): Promise<string | undefined> {
  for (const executable of cpp ? ["g++", "clang++"] : ["gcc", "clang"]) {
    const found = await new Promise<boolean>((resolve) => {
      const env: NodeJS.ProcessEnv = {};
      for (const key of [
        "PATH",
        "Path",
        "SystemRoot",
        "SYSTEMROOT",
        "WINDIR",
        "TEMP",
        "TMP",
      ])
        if (process.env[key]) env[key] = process.env[key];
      const child = spawn(executable, ["--version"], {
        env,
        shell: false,
        windowsHide: true,
        stdio: "ignore",
      });
      const timer = setTimeout(() => {
        child.kill();
        resolve(false);
      }, 2000);
      child.on("error", () => {
        clearTimeout(timer);
        resolve(false);
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        resolve(code === 0);
      });
    });
    if (found) return executable;
  }
}

// The parent owns the ten-second timer, process tree and temporary build directory.
// Arguments are passed separately; learner paths never become shell source.
const runner = `import { spawn } from 'node:child_process';
const [compiler, source, output, standard] = process.argv.slice(1);
function execute(file, args, input) {
  return new Promise(resolve => {
    const child = spawn(file, args, { shell: false, windowsHide: true, stdio: [input, 'inherit', 'inherit'] });
    child.on('error', () => { console.error('The compiler or compiled program could not start. Check your local toolchain.'); resolve(1); });
    child.on('close', code => resolve(code ?? 1));
  });
}
const compiled = await execute(compiler, ['-std='+standard, '-Wall', '-Wextra', source, '-o', output], 'ignore');
process.exitCode = compiled === 0 ? await execute(output, [], 'inherit') : compiled;
`;

export function nativeArguments(
  compiler: string | undefined,
  source: string,
  output: string,
  cpp: boolean,
) {
  if (!compiler)
    throw new UserError(
      `Install ${cpp ? "G++ or Clang++" : "GCC or Clang"}, add it to PATH, and restart OutClass. Multi-file or MSVC projects can use Project console.`,
      503,
    );
  return [
    "--input-type=module",
    "-e",
    runner,
    compiler,
    source,
    output,
    cpp ? "c++17" : "c11",
  ];
}
