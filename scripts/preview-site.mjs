import express from "express";
import path from "node:path";
const app = express();
app.use(express.static(path.resolve("dist/site")));
app.listen(47832, "127.0.0.1", () =>
  console.log("GitLearn landing page: http://127.0.0.1:47832"),
);
