import unescape from "lodash-es/unescape";

export function fmtDate(timestamp: number, fmt: string) {
  const date = new Date(timestamp);
  const YYYY = date.getFullYear();
  const MM = date.getMonth() + 1;
  const DD = date.getDate();
  const hh = date.getHours();
  const mm = date.getMinutes();
  const ss = date.getSeconds();

  const ret = fmt
    .replaceAll("YYYY", YYYY.toString().padStart(4, '0'))
    .replaceAll("MM", MM.toString().padStart(2, '0'))
    .replaceAll("DD", DD.toString().padStart(2, '0'))
    .replaceAll("hh", hh.toString().padStart(2, '0'))
    .replaceAll("mm", mm.toString().padStart(2, '0'))
    .replaceAll("ss", ss.toString().padStart(2, '0'));
  return ret;
}

export function decodeHTMLEntities(encodedStr: string) {
  return unescape(encodedStr);
}
