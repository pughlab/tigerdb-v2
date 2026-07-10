import { spawn } from "node:child_process";
import * as path from "node:path";

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
        '-resume',
        '-w', `s3://${payload.bucketName}/work`,
        '--outPrefix', payload.outPrefix,
        '--destinationPath', `s3://${payload.bucketName}/results`,
        '--minioInputPath', payload.paths.join(',')
    ]
    const options: any = {
        env: { ...process.env },
        detached: true,
        stdio: 'ignore',
    }
    const nextflowProcess = spawn('/nextflow/nextflow', args, options);
    nextflowProcess.unref();
}