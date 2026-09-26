export interface RunResult {
  code: number
  stdout: string
  stderr: string
}

export async function run(cmd: string[], cwd: string): Promise<RunResult> {
  const proc = Bun.spawn(cmd, {
    cwd,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  })
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  return { code, stdout: stdout.trim(), stderr: stderr.trim() }
}

export async function runOrThrow(cmd: string[], cwd: string): Promise<string> {
  const result = await run(cmd, cwd)
  if (result.code !== 0) {
    throw new Error(
      `\`${cmd.join(" ")}\` failed (${result.code}): ${result.stderr || result.stdout}`
    )
  }
  return result.stdout
}
