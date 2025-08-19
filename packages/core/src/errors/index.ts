export class HttpError extends Error {
  constructor(public readonly statusCode: number, public readonly message: string) {
    super(message);
  }
}

export class ProjectNotFoundError extends HttpError {
  constructor(public readonly projectId: string) {
    super(404, `Project with id ${projectId} not found`);
  }
}

export class ProjectAlreadyExistsError extends HttpError {
  constructor(public readonly projectId: string) {
    super(400, `Project with id ${projectId} already exists`);
  }
}

export class BuildNotFoundError extends HttpError {
  constructor(public readonly projectId: string, public readonly buildId: string) {
    super(404, `Build with id ${buildId} not found in project ${projectId}`);
  }
}

export class BuildStepNotFoundError extends HttpError {
  constructor(public readonly projectId: string, public readonly buildId: string, public readonly stepId: string) {
    super(404, `Build step with id ${stepId} not found in build ${buildId} in project ${projectId}`);
  }
}

export class StoredItemNotFoundError extends HttpError {
  constructor(public readonly projectId: string, public readonly buildId: string, public readonly itemId: string) {
    super(404, `Stored item with id ${itemId} not found in build ${buildId} in project ${projectId}`);
  }
}

export class StoredItemTypeMismatchError extends HttpError {
  constructor(public readonly projectId: string, public readonly buildId: string, public readonly itemId: string, public readonly expectedType: string, public readonly actualType: string) {
    super(400, `Stored item with id ${itemId} in build ${buildId} in project ${projectId} has type ${actualType} but expected type ${expectedType}`);
  }
}

export class AttachmentNotFoundError extends HttpError {
  constructor(public readonly attachmentId: string, public readonly projectId?: string, public readonly buildId?: string, public readonly stepId?: string) {
    const parts = [];
    if (projectId) parts.push(`project ${projectId}`);
    if (buildId) parts.push(`build ${buildId}`);
    if (stepId) parts.push(`step ${stepId}`);

    super(404, `Attachment with id ${attachmentId} not found ${parts.join(' in ')}`);
  }
}

export class UnsupportedExportFormatError extends HttpError {
  constructor(public readonly format: string) {
    super(400, `Unsupported export format: ${format}`);
  }
}
