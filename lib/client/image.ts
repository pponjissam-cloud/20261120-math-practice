/**
 * 업로드 이미지를 긴 변 maxSide px 이하 JPEG data URL로 줄인다.
 * HEIC는 Safari 외 브라우저에서 디코딩되지 않으므로 실패 시 안내 메시지를 던진다.
 */
export async function resizeImage(file: File, maxSide = 2000, quality = 0.88): Promise<string> {
  if (file.size > 10 * 1024 * 1024) throw new Error("10MB 이하의 사진만 올릴 수 있습니다.");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("이 사진 형식을 열 수 없습니다. JPG나 PNG로 바꿔서 올려 주세요. (아이폰 HEIC 사진은 '호환성 우선' 설정 권장)");
  }

  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지를 처리할 수 없습니다.");
  ctx.fillStyle = "white"; // 투명 PNG 배경을 흰색으로
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}
