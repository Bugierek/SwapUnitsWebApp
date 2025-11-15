import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';

type AutomationResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

async function runAutomationScript(config: unknown, skipConfirm: boolean): Promise<AutomationResult> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'swapunits-'));
  const configPath = path.join(tempDir, 'automation-config.json');
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');

  const scriptPath = path.join(process.cwd(), 'scripts/automation/add-conversion-pair.mjs');
  const args = [scriptPath, configPath];
  if (skipConfirm) {
    args.push('--yes');
  }

  try {
    return await new Promise<AutomationResult>((resolve, reject) => {
      const child = spawn('node', args, { cwd: process.cwd() });
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      child.on('error', (error) => {
        reject(error);
      });
      child.on('close', (code) => {
        resolve({
          stdout,
          stderr,
          exitCode: typeof code === 'number' ? code : -1,
        });
      });
    });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const config = body?.config;
    const skipConfirm = Boolean(body?.skipConfirm);

    if (!config?.category || !Array.isArray(config?.units) || config.units.length === 0) {
      return NextResponse.json(
        { error: 'Config must include a category and at least one unit definition.' },
        { status: 400 },
      );
    }

    const result = await runAutomationScript(config, skipConfirm);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Automation API error', error);
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
