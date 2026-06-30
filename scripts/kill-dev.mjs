/**
 * Free Vite dev ports and stray Electron processes after a forced quit.
 * Usage: node scripts/kill-dev.mjs
 */
import { execSync } from 'child_process'

const PORTS = [5173, 5174]

function killWindowsPid(pid) {
  if (!pid || pid === '0' || pid === String(process.pid)) return
  try {
    execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' })
    console.log(`Stopped process ${pid}`)
  } catch {
    // already exited
  }
}

function killWindowsPort(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' })
    const pids = new Set()
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes('LISTENING') && !line.includes('ESTABLISHED')) continue
      const parts = line.trim().split(/\s+/)
      const pid = parts[parts.length - 1]
      if (/^\d+$/.test(pid)) pids.add(pid)
    }
    for (const pid of pids) killWindowsPid(pid)
  } catch {
    // port not in use
  }
}

function killMymdElectronWindows() {
  try {
    const out = execSync(
      'wmic process where "name=\'electron.exe\'" get ProcessId,CommandLine /format:csv',
      { encoding: 'utf8' }
    )
    for (const line of out.split(/\r?\n/)) {
      if (!line.toLowerCase().includes('mymd') && !line.toLowerCase().includes('electron-vite')) {
        continue
      }
      const pid = line.split(',').pop()?.trim()
      if (/^\d+$/.test(pid ?? '')) killWindowsPid(pid)
    }
  } catch {
    // wmic unavailable or no matches
  }
}

if (process.platform === 'win32') {
  for (const port of PORTS) killWindowsPort(port)
  killMymdElectronWindows()
} else {
  for (const port of PORTS) {
    try {
      execSync(`lsof -ti :${port} | xargs kill -9 2>/dev/null`, { stdio: 'ignore', shell: true })
    } catch {
      // ignore
    }
  }
}

console.log('Dev environment cleaned.')
