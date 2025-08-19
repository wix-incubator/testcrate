import { AllurePlugin } from './AllurePlugin';
import { MCPPlugin } from './MCPPlugin';
import type { ExportControllerConfig } from './ExportControllerConfig';

export class ExportController {
  public readonly allure: AllurePlugin;
  public readonly mcp: MCPPlugin;

  constructor(config: ExportControllerConfig) {
    this.allure = new AllurePlugin(config);
    this.mcp = new MCPPlugin(config);
  }
}
