/** 서버에 API 키 등 설정이 빠졌을 때. */
export class AiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiConfigError";
  }
}

/** AI가 형식에 맞지 않는 응답을 줬을 때. 재시도 대상이다. */
export class AiOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiOutputError";
  }
}
