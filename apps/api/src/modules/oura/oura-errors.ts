type OuraErrorSource = "api" | "oauth";

type OuraApiRequestErrorOptions = {
  errorCode?: string | undefined;
  source: OuraErrorSource;
  status: number;
};

export class OuraApiRequestError extends Error {
  readonly errorCode?: string | undefined;
  readonly source: OuraErrorSource;
  readonly status: number;

  constructor(message: string, options: OuraApiRequestErrorOptions) {
    super(message);
    this.name = "OuraApiRequestError";
    this.status = options.status;
    this.source = options.source;
    this.errorCode = options.errorCode;
  }
}

export class OuraAuthenticationError extends Error {
  readonly statusCode = 401;

  constructor(message = "Oura authorization is not available. Connect or reconnect Oura and try again.") {
    super(message);
    this.name = "OuraAuthenticationError";
  }
}

export function isOuraAuthenticationError(error: unknown): error is OuraAuthenticationError {
  return error instanceof OuraAuthenticationError;
}

export function isLikelyOuraAuthenticationFailure(error: unknown) {
  if (!(error instanceof OuraApiRequestError)) {
    return false;
  }

  if (error.source === "oauth" && error.errorCode === "invalid_grant") {
    return true;
  }

  return error.status === 401 || error.status === 403;
}
