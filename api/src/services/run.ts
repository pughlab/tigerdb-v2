import { randomUUID } from "node:crypto";
import { AppAuth } from "../index.ts";
import { runQuery } from "../neo4j.ts";
import { uploadFile } from "./storage.ts";

const defaultParameters = {
  outPrefix: "TIGERdb",
  hlaFile: "",
  localMinpValue: "0.001",
  pDepth: "1000",
  globalConvergenceCutoff: "1",
  simulationDepth: "1000",
  kmerMinDepth: "3",
  localMinOVE: "10",
  allAAInterchangeable: "1",
};

function mapRunNode(node: any) {
  const props = node.properties;
  return {
    ...props,
    id: props.runID,
    public: props.isPublic,
  };
}

function getCleanParameters(run: any) {
  const {
    outPrefix,
    hlaFile,
    localMinpValue,
    pDepth,
    globalConvergenceCutoff,
    simulationDepth,
    kmerMinDepth,
    localMinOVE,
    allAAInterchangeable,
  } = run;
  const runParameters = {
    outPrefix,
    hlaFile,
    localMinpValue,
    pDepth,
    globalConvergenceCutoff,
    simulationDepth,
    kmerMinDepth,
    localMinOVE,
    allAAInterchangeable,
  };
  return { ...runParameters, ...defaultParameters };
}

export async function createRun(params: {
  input: {
    name: string;
    description: string;
    processedDatasetNames: string[];
    referenceDatasetNames: string[];
    parameters?: {
      outPrefix?: string;
      hlaFile?: string;
      localMinpValue?: number;
      pDepth?: number;
      globalConvergenceCutoff?: number;
      simulationDepth?: number;
      kmerMinDepth?: number;
      localMinOVE?: number;
      allAAInterchangeable?: number;
    };
  };
  authInfo: AppAuth;
}) {
  const { input, authInfo } = params;
  const { isAuthenticated, sub } = authInfo;
  const runId = randomUUID();
  const parameters = { ...input.parameters, ...defaultParameters };
  let creator: string | undefined = isAuthenticated ? sub : "public@tigerdb.ca";
  const query: string = `
        MERGE (k:KeycloakUser { ${isAuthenticated ? "keycloakUserID: " : "email: "} $creator })
        CREATE (r:Run {
            runID: $runID,
            name: $name,
            description: $description,
            createdOn: datetime(),
            status: $status,
            isPublic: $isPublic,
            outPrefix: $outPrefix,
            hlaFile: $hlaFile,
            localMinpValue: $localMinpValue,
            pDepth: $pDepth,
            globalConvergenceCutoff: $globalConvergenceCutoff,
            simulationDepth: $simulationDepth,
            kmerMinDepth: $kmerMinDepth,
            localMinOVE: $localMinOVE,
            allAAInterchangeable: $allAAInterchangeable
        })
        MERGE (r)-[:CREATED_BY]->(k)
        WITH r
        UNWIND $datasetNames AS datasetName
        MATCH (p:ProcessedDataset { objectName: datasetName })
        MERGE (p)-[:HAS_RUN]->(r)
        RETURN r
    `;
  const records = await runQuery(query, {
    creator,
    runID: runId,
    name: input.name,
    description: input.description,
    isPublic: !isAuthenticated,
    datasetNames: [
      ...input.processedDatasetNames,
      ...input.referenceDatasetNames,
    ],
    status: "pending",
    outPrefix: parameters.outPrefix,
    hlaFile: parameters.hlaFile,
    localMinpValue: parameters.localMinpValue,
    pDepth: parameters.pDepth,
    globalConvergenceCutoff: parameters.globalConvergenceCutoff,
    simulationDepth: parameters.simulationDepth,
    kmerMinDepth: parameters.kmerMinDepth,
    localMinOVE: parameters.localMinOVE,
    allAAInterchangeable: parameters.allAAInterchangeable,
  });
  return mapRunNode(records[0].get("r"));
}

export async function deleteRun(runId: string, authenticated: boolean) {
  const query = authenticated
    ? `
      MATCH (r:Run { runID: $runId })
      OPTIONAL MATCH (r)-[:HAS_RESULT]-(t:GliphTCR)
      WHERE apoc.node.degree(t) = 1
      WITH r, collect(t) AS tcrs
      DETACH DELETE r
      FOREACH (t IN tcrs | DETACH DELETE t)
      RETURN count(r) as deletedRuns
    `
    : `
      MATCH (u:KeycloakUser)<-[]-(x:Run)
      WHERE
        u.email = "public@tigerdb.ca"
        AND x.runID = $runId
      OPTIONAL MATCH (x)-[:HAS_RESULT]->(t:GliphTCR)
      WHERE apoc.node.degree(t) = 1
      WITH x, collect(t) AS tcrs
      DETACH DELETE x
      FOREACH (t IN tcrs | DETACH DELETE t)
      RETURN count(x) AS deletedRuns
    `;
  const records = await runQuery(query, { runId });
  return records.length > 0 && records[0].get('deletedRuns').toNumber() > 0;
}

export async function findRunWithCreator(runId: string, userId: string) {
  const query: string = `
        MATCH (r:Run { runID: $runId })-[:CREATED_BY]->(k:KeycloakUser { keycloakUserID: $userId })
        RETURN r
    `;
  const findRunRecords = await runQuery(query, {
    runId,
    userId,
  });
  if (findRunRecords.length === 0) {
    throw new Error("Run not found or user not authorized");
  }

  return mapRunNode(findRunRecords[0].get("r"));
}

export async function findPublicRun(runId: string) {
  const query: string = `
    MATCH (r:Run { runID: $runId })
    RETURN r
  `;
  const records = await runQuery(query, { runId });
  if (records.length === 0) {
    throw new Error("Run not found");
  }
  return mapRunNode(records[0].get("r"));
}

export async function shareRun(params: {
  input: { runId: string; emails: string[] };
  userId: string;
}) {
  const { input, userId } = params;
  const query = `
        MATCH (run:Run { runID: $runId })
        UNWIND $emails AS email
        MATCH (u:KeycloakUser { email: email })
        MERGE (run)-[:SHARED_WITH]->(u)
        RETURN run
    `;
  const run = await findRunWithCreator(input.runId, userId);
  const records = await runQuery(query, {
    runId: run.id,
    emails: input.emails,
  });

  if (records.length === 0) {
    throw new Error("Could not share the run with the selected users");
  }

  return mapRunNode(records[0].get("run"));
}

export async function stopSharingRun(params: {
  input: { runId: string; email: string };
  userId: string;
}) {
  const { input, userId } = params;
  const query = `
        MATCH (run:Run { runID: $runId })-[r:SHARED_WITH]->(u:KeycloakUser { email: $email })
        DELETE r
        RETURN run
    `;
  const run = await findRunWithCreator(input.runId, userId);
  const records = await runQuery(query, {
    runId: run.id,
    email: input.email,
  });
  if (records.length === 0) {
    throw new Error("Could not stop sharing the run with the selected user");
  }

  return mapRunNode(records[0].get("run"));
}

export async function getTCRCount(runId: string): Promise<number> {
  const query: string = `
    MATCH (n:Run { runID: $runId })-[:HAS_RESULT]->(t:GliphTCR)
    RETURN count(t) as tcrCount
  `;
  const records = await runQuery(query, { runId });
  if (records.length === 0) {
    return 0;
  }
  return records[0].get("tcrCount").toNumber();
}

async function getProcessedDatasets(runId: string) {
  const query = `
        MATCH (r:Run { runID: $runId })<-[:HAS_RUN]-(pd:ProcessedDataset)
        RETURN pd
    `;
  const records = await runQuery(query, { runId });
  return records.map((record) => record.get("pd").properties);
}

export async function createRunFiles(run: any) {
  const parameters = getCleanParameters(run);
  const processedDatasets = (await getProcessedDatasets(run.id)) || [];
  const parameterFileContent: string = [
    "#this line will be ignored",
    `out_prefix=${parameters.outPrefix}`,
    `cdr3_file=${parameters.outPrefix}_GLIPH_INPUT.txt`,
    parameters.hlaFile
      ? `hla_file=${parameters.hlaFile}`
      : `#hla_file=hla_file.txt`,
    `refer_file=ref_CD48_v2.0.txt`,
    `v_usage_freq_file=ref_V_CD48_v2.0.txt`,
    `cdr3_length_freq_file=ref_L_CD48_v2.0.txt`,
    `local_min_pvalue=${parameters.localMinpValue}`,
    `p_depth=${parameters.pDepth}`,
    `global_convergence_cutoff=${parameters.globalConvergenceCutoff}`,
    `simulation_depth=${parameters.simulationDepth}`,
    `kmer_min_depth=${parameters.kmerMinDepth}`,
    `local_min_OVE=${parameters.localMinOVE}`,
    `algorithm=GLIPH2`,
    `all_aa_interchangeable=${parameters.allAAInterchangeable}`,
  ].join("\n");
  const datasetTsvLines: string[] = ["datasetID\tobjectName"];
  const inputPaths: string[] = [];
  processedDatasets.forEach((dataset) => {
    datasetTsvLines.push(`.\t${dataset.objectName}`);
    inputPaths.push(`s3://${dataset.bucketName}/${dataset.objectName}`);
  });
  return {
    datasetsTsv: datasetTsvLines.join("\n"),
    parameterFile: parameterFileContent,
    inputPaths,
  };
}

export async function changeRunStatus(
  runId: string,
  status: "pending" | "submitted" | "completed" | "failed",
  workflowId: string,
) {
  const query = `
        MATCH (r:Run { runID: $runId })
        SET 
            r.status = $status,
            r.workflowId = coalesce($workflowId, ""),
            r.submittedOn = coalesce(r.submittedOn, datetime())
        RETURN r
    `;
  const records = await runQuery(query, {
    runId,
    status,
    workflowId,
  });
  if (records.length === 0) {
    throw new Error("Run not found");
  }
  return mapRunNode(records[0].get("r"));
}

export async function updateRunParameters(params: {
  input: {
    runId: string;
    outPrefix?: string;
    localMinpValue?: number;
    pDepth?: number;
    globalConvergenceCutoff?: number;
    simulationDepth?: number;
    kmerMinDepth?: number;
    localMinOVE?: number;
    allAAInterchangeable?: number;
  };
}) {
  const { input } = params;
  const query = `
        MATCH (r:Run { runID: $runId })
        SET
            r.outPrefix = coalesce($outPrefix, r.outPrefix),
            r.localMinpValue = coalesce($localMinpValue, r.localMinpValue),
            r.pDepth = coalesce($pDepth, r.pDepth),
            r.globalConvergenceCutoff = coalesce($globalConvergenceCutoff, r.globalConvergenceCutoff),
            r.simulationDepth = coalesce($simulationDepth, r.simulationDepth),
            r.kmerMinDepth = coalesce($kmerMinDepth, r.kmerMinDepth),
            r.localMinOVE = coalesce($localMinOVE, r.localMinOVE),
            r.allAAInterchangeable = coalesce($allAAInterchangeable, r.allAAInterchangeable)
        RETURN r
    `;
  const records = await runQuery(query, {
    runId: input.runId,
    outPrefix: input.outPrefix,
    localMinpValue: input.localMinpValue,
    pDepth: input.pDepth,
    globalConvergenceCutoff: input.globalConvergenceCutoff,
    simulationDepth: input.simulationDepth,
    kmerMinDepth: input.kmerMinDepth,
    localMinOVE: input.localMinOVE,
    allAAInterchangeable: input.allAAInterchangeable,
  });
  if (records.length === 0) {
    throw new Error("Run not found");
  }
  return mapRunNode(records[0].get("r"));
}

export async function updateRunStatus(payload: {
  runId: string;
  status: "completed" | "failed";
  logs: string;
  completeTime: string;
}) {
  const { runId, status, logs, completeTime } = payload;
  const query: string = `
    MATCH (r:Run { runID: $runId })
    SET 
      r.status = $status,
      r.completedOn = datetime($completeTime)
    RETURN r
  `;
  const records = await runQuery(query, {
    runId,
    status,
    completeTime,
  });
  if (records.length === 0) {
    throw new Error("Run not found");
  }
  const bucketName = `run-${runId}`;
  await uploadFile(bucketName, "final.log", Buffer.from(logs));
  return mapRunNode(records[0].get("r"));
}
