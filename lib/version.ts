/** 배포 버전(커밋 앞 7자리). 화면에 보여 줘서 새 배포가 반영됐는지 확인할 수 있게 한다. */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "local";
