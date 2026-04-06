
export const parseJwt = (token: string): Record<string, any> | null => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";

    const lookup =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const bytes: number[] = [];
    let i = 0;
    while (i < base64.length) {
      const a = lookup.indexOf(base64[i++]);
      const b = lookup.indexOf(base64[i++]);
      const c = lookup.indexOf(base64[i++]);
      const d = lookup.indexOf(base64[i++]);
      bytes.push((a << 2) | (b >> 4));
      if (base64[i - 2] !== "=") bytes.push(((b & 15) << 4) | (c >> 2));
      if (base64[i - 1] !== "=") bytes.push(((c & 3) << 6) | d);
    }

    const str = bytes.map((b) => String.fromCharCode(b)).join("");
    return JSON.parse(str);
  } catch {
    return null;
  }
};
