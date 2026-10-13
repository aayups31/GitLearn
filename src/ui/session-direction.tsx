import React, { useEffect, useState } from "react";
import { ArrowUpRight, Compass } from "lucide-react";
import type { LearningPath } from "../server/learning-path";
type Path = ReturnType<LearningPath["status"]>;
export function SessionDirection({
  api,
  courseId,
  changed,
  onOpen,
}: {
  api: <T>(route: string, body?: unknown) => Promise<T>;
  courseId: string;
  changed?: unknown;
  onOpen: () => void;
}) {
  const [path, setPath] = useState<Path>();
  useEffect(() => {
    let live = true;
    void api<Path>(`learning-path?courseId=${encodeURIComponent(courseId)}`)
      .then((r) => {
        if (live) setPath(r);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [courseId, changed]);
  const next = path?.milestones.find((m) => !m.record);
  return (
    <div className="session-direction" aria-label="Your learning direction">
      <Compass size={15} />
      <div>
        <small>
          {path?.direction ? "Building toward" : "Give this course a purpose"}
        </small>
        <span>
          {path?.direction?.goal ||
            "What do you want to build with these skills?"}
        </span>
      </div>
      <button onClick={onOpen} title={next?.title}>
        {path?.direction ? "My project path" : "Set my direction"}
        <ArrowUpRight size={12} />
      </button>
    </div>
  );
}
