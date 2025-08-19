import type { ExportControllerConfig } from './ExportControllerConfig';

export class MCPPlugin {
  constructor(private readonly config: ExportControllerConfig) {}

  async exportBuildResults(projectId: string, buildId: string): Promise<string> {
    const buildSteps = await this.config.buildStepQuery.listBuildSteps({ projectId, buildId });
    const build = (await this.config.buildQuery.getBuild({ projectId, buildId }))!;
    const project = (await this.config.projectQuery.getProject({ projectId }))!;

    let markdown = `# Build: ${build.name}\n\n`;
    markdown += `**Project:** ${project.name}\n`;
    markdown += `**Status:** ${build.status || 'unknown'}\n`;
    markdown += `**Stage:** ${build.stage}\n`;
    markdown += `**Duration:** ${build.stop ? build.stop - build.start : 'ongoing'}ms\n\n`;

    if (buildSteps.items.length > 0) {
      markdown += '## Build Steps\n\n';

      for (const step of buildSteps.items) {
        markdown += `### ${step.name}\n\n`;
        markdown += `**Status:** ${step.status || 'unknown'}\n`;
        markdown += `**Stage:** ${step.stage}\n`;
        markdown += `**Duration:** ${step.stop ? step.stop - step.start : 'ongoing'}ms\n\n`;

        if (step.statusDetails?.message) {
          markdown += `**Error Message:**\n\`\`\`\n${step.statusDetails.message}\n\`\`\`\n\n`;
        }

        if (step.statusDetails?.trace) {
          markdown += `**Stack Trace:**\n\`\`\`\n${step.statusDetails.trace}\n\`\`\`\n\n`;
        }
      }
    }

    return markdown;
  }
}
