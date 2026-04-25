import { AIRouter, getProjectPreset } from "ai-router";

const preset = getProjectPreset("E-mail Guru");

export const aiRouter = new AIRouter({
  ...preset,
  projectName: "E-mail Guru",
});

export { aiRouter as router };
