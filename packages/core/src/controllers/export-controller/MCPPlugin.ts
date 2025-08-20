import type { Build, Project } from '@core/schema';

import type { ExportControllerConfig } from './ExportControllerConfig';

export class MCPPlugin {
  constructor(private readonly config: ExportControllerConfig) {}

  async exportBuildResults(projectId: string, buildId: string): Promise<string> {
    // Get the root build with all its children populated
    const build = await this.config.buildQuery.getBuild({ projectId, buildId });
    if (!build) {
      return `# Build not found: ${buildId}`;
    }

    const project = await this.config.projectQuery.getProject({ projectId });
    if (!project) {
      return `# Project not found: ${projectId}`;
    }

    return this.#buildToMarkdown(build, project, 1);
  }

  #buildToMarkdown(build: Build, project: Project, level: number): string {
    const indent = '#'.repeat(level);
    let result = '';

    result += `${indent} ${build.name}\n\n`;
    result += `**Project:** ${project.name}\n`;
    result += `**Duration:** ${build.stop ? build.stop - build.start : 'ongoing'}ms\n\n`;
    result += `**Stage:** ${build.stage}\n`;
    result += `**Status:** ${build.status || 'unknown'}\n`;

    if (build.statusDetails?.message) {
      result += `**Error Message:**\n\`\`\`\n${build.statusDetails.message}\n\`\`\`\n\n`;
    }

    if (build.statusDetails?.trace) {
      result += `**Stack Trace:**\n\`\`\`\n${build.statusDetails.trace}\n\`\`\`\n\n`;
    }

    // Recursively process children
    if (build.children?.length) {
      for (const child of build.children) {
        result += this.#buildToMarkdown(child, project, level + 1);
      }
    }

    return result;
  }
}
