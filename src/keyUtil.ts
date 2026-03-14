const keyNameToCode: Record<string, number> = {
  TAB: 9,
  PAUSE: 19,
  PAGEUP: 33,
  PAGEDOWN: 34,
  END: 35,
  HOME: 36,
  ARROWLEFT: 37,
  ARROWUP: 38,
  ARROWRIGHT: 39,
  ARROWDOWN: 40,
  INSERT: 45,
  DELETE: 46,
};

// add letters
for (let i = 65; i <= 90; i++) {
  keyNameToCode[String.fromCharCode(i).toUpperCase()] = i;
}

// add digits
for (let i = 0; i <= 9; i++) {
  keyNameToCode[i.toString()] = 48 + i;
}

// F1–F12
for (let i = 1; i <= 12; i++) {
  keyNameToCode[`F${i}`] = 111 + i;
}

export function keyNameToHex(key: string): string | null {
  const keyCode = keyNameToCode[key.toUpperCase()];
  if (keyCode === undefined) return null;
  return "0x" + keyCode.toString(16).toUpperCase();
}
