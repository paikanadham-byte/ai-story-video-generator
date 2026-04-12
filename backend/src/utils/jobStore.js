const jobs = new Map();

export function createJob(id) {
  const job = {
    id,
    status: "pending",
    progress: 0,
    currentStep: "",
    scenes: [],
    outputPath: null,
    error: null,
    createdAt: Date.now(),
  };
  jobs.set(id, job);
  return job;
}

export function getJob(id) {
  return jobs.get(id) || null;
}

export function updateJob(id, updates) {
  const job = jobs.get(id);
  if (!job) return null;
  Object.assign(job, updates);
  return job;
}

export function deleteJob(id) {
  jobs.delete(id);
}

export function listJobs() {
  return Array.from(jobs.values());
}
