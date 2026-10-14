import { randomUUID, createHash } from "node:crypto";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Application } from "./application.js";
import type { AcademyDraft } from "../expansion-contract.js";
import { UserError } from "./safety.js";
import { productionProcess } from "./production-process.js";
export const apiStarter = `"""Activity API project. Implement each stage, then run test_project.py."""
def normalize_record(record):
    raise NotImplementedError("Validate a user and non-negative integer minutes")

def group_totals(records):
    raise NotImplementedError("Accumulate minutes for each user")

def query_report(records, minimum=0):
    raise NotImplementedError("Filter totals and order by user")

def handle_request(method, path, records):
    raise NotImplementedError("Return (status, JSON-compatible body)")
`;
export const apiServer = `from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
import json
from main import handle_request
class Handler(BaseHTTPRequestHandler):
    def respond(self, method):
        records=json.loads(Path(__file__).with_name("data.json").read_text())
        status,body=handle_request(method,self.path,records)
        payload=json.dumps(body).encode()
        self.send_response(status);self.send_header("Content-Type","application/json");self.send_header("Content-Length",str(len(payload)));self.end_headers();self.wfile.write(payload)
    def do_GET(self): self.respond("GET")
    def do_POST(self): self.respond("POST")
if __name__=="__main__":
    print("Activity API: http://127.0.0.1:8000/report",flush=True)
    HTTPServer(("127.0.0.1",8000),Handler).serve_forever()
`;
const reference = `def normalize_record(record):
    if not isinstance(record, dict): raise ValueError("record must be an object")
    user = record.get("user")
    minutes = record.get("minutes")
    if not isinstance(user,str) or not user.strip(): raise ValueError("user required")
    if isinstance(minutes,bool) or not isinstance(minutes,int) or minutes < 0: raise ValueError("minutes must be a non-negative integer")
    return {"user":user.strip(),"minutes":minutes}

def group_totals(records):
    totals={}
    for record in records:
        value=normalize_record(record)
        totals[value["user"]]=totals.get(value["user"],0)+value["minutes"]
    return totals

def query_report(records, minimum=0):
    if isinstance(minimum,bool) or not isinstance(minimum,int) or minimum<0: raise ValueError("invalid minimum")
    return [{"user":name,"minutes":value} for name,value in sorted(group_totals(records).items()) if value>=minimum]

def handle_request(method,path,records):
    if path!="/report": return 404,{"error":"not_found"}
    if method!="GET": return 405,{"error":"method_not_allowed"}
    try: return 200,{"items":query_report(records)}
    except ValueError: return 400,{"error":"invalid_record"}
`;
export const apiTests = `import json, unittest, importlib.util, pathlib, sys
spec=importlib.util.spec_from_file_location("project",pathlib.Path(__file__).with_name("main.py"))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class ProjectTests(unittest.TestCase):
    def test_01_normalizes_user(self): self.assertEqual(m.normalize_record({"user":" Ada ","minutes":2}),{"user":"Ada","minutes":2})
    def test_02_rejects_blank_user(self):
        with self.assertRaises(ValueError): m.normalize_record({"user":" ","minutes":0})
    def test_03_rejects_negative(self):
        with self.assertRaises(ValueError): m.normalize_record({"user":"Ada","minutes":-1})
    def test_04_rejects_boolean(self):
        with self.assertRaises(ValueError): m.normalize_record({"user":"Ada","minutes":True})
    def test_05_rejects_float(self):
        with self.assertRaises(ValueError): m.normalize_record({"user":"Ada","minutes":1.5})
    def test_06_rejects_missing(self):
        with self.assertRaises(ValueError): m.normalize_record({"user":"Ada"})
    def test_07_groups_repeated_users(self): self.assertEqual(m.group_totals([{"user":"Ada","minutes":25},{"user":"Ada","minutes":20}]),{"Ada":45})
    def test_08_handles_empty(self): self.assertEqual(m.group_totals([]),{})
    def test_09_keeps_users_separate(self): self.assertEqual(m.group_totals([{"user":"Ada","minutes":2},{"user":"Bob","minutes":3}]),{"Ada":2,"Bob":3})
    def test_10_preserves_zero(self): self.assertEqual(m.group_totals([{"user":"Ada","minutes":0}]),{"Ada":0})
    def test_11_filters(self): self.assertEqual(m.query_report([{"user":"Ada","minutes":1},{"user":"Bob","minutes":5}],3),[{"user":"Bob","minutes":5}])
    def test_12_orders_users(self): self.assertEqual(m.query_report([{"user":"Zoe","minutes":2},{"user":"Ada","minutes":4}]),[{"user":"Ada","minutes":4},{"user":"Zoe","minutes":2}])
    def test_13_rejects_negative_minimum(self):
        with self.assertRaises(ValueError): m.query_report([],-1)
    def test_14_report_status(self): self.assertEqual(m.handle_request("GET","/report",[]),(200,{"items":[]}))
    def test_15_unknown_path(self): self.assertEqual(m.handle_request("GET","/missing",[]),(404,{"error":"not_found"}))
    def test_16_wrong_method(self): self.assertEqual(m.handle_request("POST","/report",[]),(405,{"error":"method_not_allowed"}))
    def test_17_invalid_request_data(self): self.assertEqual(m.handle_request("GET","/report",[{"user":"Ada","minutes":-1}]),(400,{"error":"invalid_record"}))
    def test_18_json_response(self): self.assertIn("Ada",json.dumps(m.handle_request("GET","/report",[{"user":"Ada","minutes":2}])[1]))
if __name__=="__main__":
    result=unittest.TextTestRunner(stream=sys.stderr,verbosity=1).run(unittest.defaultTestLoader.loadTestsFromTestCase(ProjectTests))
    print("OUTCLASS_CI:"+json.dumps({"tests":result.testsRun,"passed":result.testsRun-len(result.failures)-len(result.errors),"failed":[case.id().split(".")[-1] for case,_ in result.failures+result.errors],"python":sys.version.split()[0]}))
    sys.exit(0 if result.wasSuccessful() else 1)
`;
export const milestones = [
  {
    title: "Validate a record",
    function: "normalize_record",
    objective:
      "Validate structured input without accepting booleans as integers",
    checks: "01–06",
    brief:
      "Normalize user whitespace and reject missing, blank, negative, boolean and fractional values.",
  },
  {
    title: "Accumulate activity",
    function: "group_totals",
    objective: "Retain state correctly across repeated records",
    checks: "07–10",
    brief:
      "Group minutes by user. Preserve zero and empty inputs. Do not overwrite a user's earlier total.",
  },
  {
    title: "Query the report",
    function: "query_report",
    objective:
      "Compose validation, aggregation, filtering and deterministic ordering",
    checks: "11–13",
    brief:
      "Filter by an inclusive minimum total, order by user, and reject invalid minimums.",
  },
  {
    title: "Design the API boundary",
    function: "handle_request",
    objective: "Apply HTTP semantics and produce JSON-compatible responses",
    checks: "14–18",
    brief:
      "Handle GET /report, not-found paths, unsupported methods and invalid records. Extend this pure boundary to a server in your independent capstone.",
  },
];
type Result = {
  tests: number;
  passed: number;
  failed: string[];
  python: string;
};
export type CompiledProject = {
  id: string;
  courseId: string;
  revision: number;
  templateVersion: 1;
  title: string;
  validatedAt: string;
  sourceHash: string;
  milestones: typeof milestones;
  reference: Result;
  starter: Result;
  verified: boolean;
  httpStatus?: number;
};
export class AcademyCompiler {
  private busy = false;
  constructor(private app: Application) {}
  status(courseId: string) {
    return this.app.store.get<CompiledProject>(`academy:compiled:${courseId}`);
  }
  async compile(courseId: string, revision: number, course: AcademyDraft) {
    if (this.busy)
      throw new UserError("Another course validation is running.", 409);
    this.busy = true;
    let dir: string | undefined;
    try {
      dir = await mkdtemp(path.join(tmpdir(), "outclass-course-ci-"));
      const check = async (source: string) => {
        await writeFile(path.join(dir!, "main.py"), source);
        await writeFile(path.join(dir!, "test_project.py"), apiTests);
        const output = await productionProcess(
          "python",
          ["-I", "-S", "test_project.py"],
          dir!,
          10000,
        );
        const line = output.stdout
          .split(/\r?\n/)
          .find((l) => l.startsWith("OUTCLASS_CI:"));
        if (!line)
          throw new UserError(
            "Python did not return a valid Course CI report.",
          );
        return JSON.parse(line.slice(12)) as Result;
      };
      const passed = await check(reference),
        starter = await check(apiStarter);
      await writeFile(path.join(dir, "main.py"), reference);
      await writeFile(path.join(dir, "server.py"), apiServer);
      await writeFile(
        path.join(dir, "data.json"),
        JSON.stringify([
          { user: "Ada", minutes: 25 },
          { user: "Ada", minutes: 20 },
        ]),
      );
      const smoke = await productionProcess(
        "python",
        [
          "-I",
          "-S",
          "-c",
          `import os,sys,json,threading,urllib.request\nsys.path.insert(0,os.getcwd())\nfrom server import Handler,HTTPServer\ns=HTTPServer(("127.0.0.1",0),Handler)\nthreading.Thread(target=s.serve_forever,daemon=True).start()\nr=urllib.request.urlopen("http://127.0.0.1:%s/report"%s.server_port,timeout=2)\nassert json.load(r)=={"items":[{"user":"Ada","minutes":45}]}\nprint(r.status)\ns.shutdown()`,
        ],
        dir,
        10000,
      );
      const httpStatus = Number(smoke.stdout.trim());
      const record: CompiledProject = {
        id: randomUUID(),
        courseId,
        revision,
        templateVersion: 1,
        title: "Python activity API",
        sourceHash: createHash("sha256")
          .update(JSON.stringify(course))
          .digest("hex"),
        validatedAt: new Date().toISOString(),
        milestones,
        reference: passed,
        starter,
        httpStatus,
        verified:
          passed.tests === 18 &&
          passed.passed === 18 &&
          starter.tests === 18 &&
          starter.passed === 0 &&
          httpStatus === 200,
      };
      if (!record.verified)
        throw new UserError(
          "The reference or starter failed the expected Course CI contract.",
        );
      this.app.store.put(`academy:compiled:${courseId}`, record);
      return record;
    } finally {
      this.busy = false;
      if (dir) await rm(dir, { recursive: true, force: true });
    }
  }
}
