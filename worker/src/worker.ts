import { spawn } from "node:child_process";
import * as path from "node:path";
import * as process from "node:process";
import { connection } from "./index.ts";

async function notifyAPI(runId: string, status: string, logs: string, completeTime: Date) {
  try {
    const channel = connection.createChannel({
      json: true
    });
    await channel.assertQueue(process.env.RABBITMQ_STATUS_QUEUE!, { durable: true });
    const payload = { runId, status, logs, completeTime: completeTime.toISOString() };
    await channel.sendToQueue(process.env.RABBITMQ_STATUS_QUEUE!, payload, { persistent: true });
    await channel.close();
    console.log(`Run ${runId} result sent to API`);
  } catch (error) {
    console.error("Error notifying API:", error);
  }
}

export function startPipeline(payload: {
    workflowId: string;
    bucketName: string;
    paths: string[];
    runId: string;
    outPrefix: string;
}) {
    const args: string[] = [
        '-log', `logs/${payload.workflowId}.log`,
        'run',
        path.resolve('main.nf'),
        '-w', `s3://${payload.bucketName}/work`,
        '--outPrefix', `${payload.outPrefix}`,
        '--destinationPath', `s3://${payload.bucketName}/results`,
        '--inputPath', payload.paths.join(',')
    ]
    const options: any = {
        env: { ...process.env },
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
    }
    let logsBuffer: string = '';
    const nextflowProcess = spawn('/nextflow/nextflow', args, options);
    nextflowProcess.stdout.on('data', (data) => {
      const output: string = data.toString();
      process.stdout.write(output);
      logsBuffer += output;
    });
    nextflowProcess.stderr.on('data', (data) => {
      const errorOutput: string = data.toString();
      process.stderr.write(errorOutput);
      logsBuffer += errorOutput;
    });
    nextflowProcess.on('close', async (code) => {
      const completeTime = new Date();
      const status = code === 0 ? 'completed' : 'failed';
      console.log(`Nextflow process exited with code ${code}, status: ${status}`);
      await notifyAPI(payload.runId, status, logsBuffer, completeTime);
    });
    nextflowProcess.on('error', async (err) => {
      const completeTime = new Date();
      logsBuffer += `\nError starting process: ${err.message}`;
      console.error('Critical error spawning process:', err);
      await notifyAPI(payload.runId, 'failed', logsBuffer, completeTime);
    });
}