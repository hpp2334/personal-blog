export function fmtDate(timestamp: number, fmt: string) {
  const date = new Date(timestamp);
  const YYYY = date.getFullYear();
  const MM = date.getMonth() + 1;
  const DD = date.getDate();
  const hh = date.getHours();
  const mm = date.getMinutes();
  const ss = date.getSeconds();

  const ret = fmt
    .replaceAll("YYYY", YYYY.toString())
    .replaceAll("MM", MM.toString())
    .replaceAll("DD", DD.toString())
    .replaceAll("hh", hh.toString())
    .replaceAll("mm", mm.toString())
    .replaceAll("ss", ss.toString());
  return ret;
}
