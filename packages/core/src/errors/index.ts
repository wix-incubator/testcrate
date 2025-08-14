export class BuildNotFoundError extends Error {
  constructor(public readonly projectId: string, public readonly buildId: string) {
    super(`Build with id ${buildId} not found in project ${projectId}`);
  }
}

export class BuildStepNotFoundError extends Error {
  constructor(public readonly projectId: string, public readonly buildId: string, public readonly stepId: string) {
    super(`Build step with id ${stepId} not found in build ${buildId} in project ${projectId}`);
  }
}

export class StoredItemNotFoundError extends Error {
  constructor(public readonly projectId: string, public readonly buildId: string, public readonly itemId: string) {
    super(`Stored item with id ${itemId} not found in build ${buildId} in project ${projectId}`);
  }
}

export class StoredItemTypeMismatchError extends Error {
  constructor(public readonly projectId: string, public readonly buildId: string, public readonly itemId: string, public readonly expectedType: string, public readonly actualType: string) {
    super(`Stored item with id ${itemId} in build ${buildId} in project ${projectId} has type ${actualType} but expected type ${expectedType}`);
  }
}

export class ProjectAlreadyExistsError extends Error {
  constructor(public readonly projectId: string) {
    super(`Project with id ${projectId} already exists`);
  }
}

export class ProjectNotFoundError extends Error {
  constructor(public readonly projectId: string) {
    super(`Project with id ${projectId} not found`);
  }
}
