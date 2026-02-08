import { execSync } from 'child_process';
import os from 'os';

interface WindowGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

function getWindowsGeometryByExe(exeName: string): WindowGeometry | null {
  try {
    const cleanName = exeName.replace(/\.exe$/i, '');
    
    const psCommand = `
      $p = Get-Process -Name "${cleanName}" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1;
      if ($p) {
        Add-Type -AssemblyName UIAutomationClient;
        $ae = [System.Windows.Automation.AutomationElement]::FromHandle($p.MainWindowHandle);
        $r = $ae.Current.BoundingRectangle;
        Write-Output "$($r.X),$($r.Y),$($r.Width),$($r.Height)";
      }
    `;

    const output = execSync(`powershell -NoProfile -Command "${psCommand.replace(/\n/g, ' ')}"`, { encoding: 'utf8' }).trim().replace(/\n/g, ',');
    
    if (!output) return null;

    const [x, y, width, height] = output.split(',').map(Number);
    return { x, y, width, height };
  } catch (e) {
    return null;
  }
}

/**
 * Uses xdotool to map PID to Window ID
 */
function getLinuxGeometryByExe(exeName: string): WindowGeometry | null {
  try {
    // 1. Get the PID of the process
    const pid = execSync(`pidof -s ${exeName}`, { encoding: 'utf8' }).trim();
    
    // 2. Find the Window ID associated with that PID
    const windowId = execSync(`xdotool search --pid ${pid} | tail -1`, { encoding: 'utf8' }).trim();
    
    // 3. Get the geometry
    const output = execSync(`xwininfo -id ${windowId}`, { encoding: 'utf8' });

    const x = parseInt(output.match(/Absolute upper-left X:\s+(-?\d+)/)?.[1] || "0");
    const y = parseInt(output.match(/Absolute upper-left Y:\s+(-?\d+)/)?.[1] || "0");
    const width = parseInt(output.match(/Width:\s+(\d+)/)?.[1] || "0");
    const height = parseInt(output.match(/Height:\s+(\d+)/)?.[1] || "0");

    return { x, y, width, height };
  } catch (e) {
    return null;
  }
}

export function getWindowGeometryByExe(exeName: string): WindowGeometry | null {
  const platform = os.platform();

  if (platform === 'win32') {
    return getWindowsGeometryByExe(exeName);
  } else if (platform === 'linux') {
    return getLinuxGeometryByExe(exeName);
  }
  
  throw new Error(`Unsupported platform: ${platform}`);
}