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
  CONTEXTMENU: 93,
  SEMICOLON: 186,
  EQUAL: 187,
  COMMA: 188,
  DASH: 189,
  PERIOD: 190,
  SLASH: 191,
  BACKQUOTE: 192,
  BRACKETLEFT: 219,
  BACKSLASH: 220,
  BRACKETRIGHT: 221,
  QUOTE: 222,
  NUMPADMULTIPLY: 106,
  NUMPADADD: 107,
  NUMPADSUBTRACT: 109,
  NUMPADDECIMAL: 110,
  NUMPADDIVIDE: 111,
};

// Letters
for (let i = 65; i <= 90; i++) keyNameToCode[String.fromCharCode(i)] = i;

// Digits
for (let i = 0; i <= 9; i++) keyNameToCode[i.toString()] = 48 + i;

//Function Keys
for (let i = 1; i <= 12; i++) keyNameToCode[`F${i}`] = 111 + i;

// Numpad Numbers
for (let i = 0; i <= 9; i++) keyNameToCode[`NUMPAD${i}`] = 96 + i;

export function keyNameToHex(key: string): string | null {
  const keyCode = keyNameToCode[key.toUpperCase()];
  if (keyCode === undefined) return null;
  return "0x" + keyCode.toString(16).toUpperCase();
}
