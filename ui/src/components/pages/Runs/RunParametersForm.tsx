import useUpdateRunParametersMutation from "../../../hooks/useUpdateRunParametersMutation.ts";
import { useEffect, useRef, useState } from "react";
import {
  Divider,
  Dropdown,
  Form,
  Grid,
  Header,
  Icon,
  Input,
  Message,
  Segment,
} from "semantic-ui-react";
import { useDebounce } from "use-debounce";

type RunParameters = {
  outPrefix: string;
  localMinpValue: number,
  pDepth: number,
  globalConvergenceCutoff: number,
  simulationDepth: number,
  kmerMinDepth: number,
  localMinOVE: number,
  allAAInterchangeable: number,
}

const initialParameters: RunParameters = {
  outPrefix: "TIGERdb",
  localMinpValue: 0.001,
  pDepth: 1000,
  globalConvergenceCutoff: 1,
  simulationDepth: 1000,
  kmerMinDepth: 3,
  localMinOVE: 10,
  allAAInterchangeable: 1,
};

function RunParametersFormContent({
  runID,
  initialData,
}: Readonly<{ runID: string; initialData: RunParameters }>) {
  const [parameters, setParameters] = useState<RunParameters>(initialData);
  const [debouncedParameters] = useDebounce(parameters, 500);

  const {
    updateRunParametersMutation: saveParameters,
    loading: saveParametersLoading,
    error: saveParametersError,
  } = useUpdateRunParametersMutation();
  const lastSavedParams = useRef(JSON.stringify(debouncedParameters));

  useEffect(() => {
    const currentParamsString = JSON.stringify(debouncedParameters);
    if (currentParamsString !== lastSavedParams.current) {
      lastSavedParams.current = currentParamsString;
      saveParameters({
        variables: {
          input: { runId: runID, ...debouncedParameters },
        },
      });
    }
  }, [runID, debouncedParameters, saveParameters]);

  return (
    <Message color="grey">
      <Header as={"h4"} icon>
        <Icon name="paper plane" />
        RUN PARAMETERS
      </Header>
      <Message>
        <Form>
          <Form.Field
            control={Input}
            label="Results Prefix"
            placeholder="TIGERdb"
            value={parameters.outPrefix}
            onChange={(_e, { value }) =>
              setParameters((prev) => ({ ...prev, outPrefix: value }))
            }
          />
          <Segment color="violet">
            <Divider horizontal content="CDR3 INPUT" />
            <Form.Field
              control={Dropdown}
              label="External Specificity File"
              placeholder="TIGERdb_MinimalScoreConfidence3_VersionII.tsv"
              value="TIGERdb_MinimalScoreConfidence3_VersionII.tsv"
              search
              selection
              fluid
              disabled
            />
          </Segment>
          <Form.Field
            control={Dropdown}
            label="HLA File"
            placeholder="hla_file.txt"
            selection
            fluid
            disabled
          />
          <Segment color="violet">
            <Divider horizontal content="Reference Files" />
            <Form.Field
              control={Dropdown}
              label="Reference File"
              placeholder="ref_CD48_v2.0.txt"
              value="ref_CD48_v2.0.txt"
              selection
              fluid
              search
              disabled
            />
            <Form.Field
              control={Dropdown}
              label="V Usage Frequency File"
              placeholder="ref_V_CD48_v2.0.txt"
              value="ref_V_CD48_v2.0.txt"
              selection
              fluid
              search
              disabled
            />
            <Form.Field
              control={Dropdown}
              label="CDR3 Length Frequency File"
              placeholder="ref_L_CD48_v2.0.txt"
              value="ref_L_CD48_v2.0.txt"
              search
              selection
              fluid
              disabled
            />
          </Segment>
          <Grid columns={2}>
            <Grid.Column>
              <Form.Field
                control={Input}
                label="Local Min P-Value"
                placeholder="0.001"
                value={parameters.localMinpValue}
                onChange={(_e, { value }) =>
                  setParameters((prev) => ({
                    ...prev,
                    localMinpValue: Number.parseFloat(value),
                  }))
                }
                type="number"
                step="0.001" // Allows decimal numbers
              />
              <Form.Field
                control={Input}
                label="P Depth"
                placeholder="1000"
                value={parameters.pDepth}
                onChange={(_e, { value }) =>
                  setParameters((prev) => ({
                    ...prev,
                    pDepth: Number.parseInt(value, 10),
                  }))
                }
                type="number"
                step="100"
              />
              <Form.Field
                control={Input}
                label="Global Convergence Cutoff"
                placeholder="1"
                value={parameters.globalConvergenceCutoff}
                onChange={(_e, { value }) =>
                  setParameters((prev) => ({
                    ...prev,
                    globalConvergenceCutoff: Number.parseInt(value, 10),
                  }))
                }
                type="number"
                step="1"
              />
              <Form.Field
                control={Input}
                label="Simulation Depth"
                placeholder="1000"
                value={parameters.simulationDepth}
                onChange={(_e, { value }) =>
                  setParameters((prev) => ({
                    ...prev,
                    simulationDepth: Number.parseInt(value, 10),
                  }))
                }
                type="number"
                step="100"
              />
            </Grid.Column>
            <Grid.Column>
              <Form.Field
                control={Input}
                label="Kmer Min Depth"
                placeholder="3"
                value={parameters.kmerMinDepth}
                onChange={(_e, { value }) =>
                  setParameters((prev) => ({
                    ...prev,
                    kmerMinDepth: Number.parseInt(value, 10),
                  }))
                }
                type="number"
                step="1"
              />
              <Form.Field
                control={Input}
                label="Local Min OVE"
                placeholder="10"
                value={parameters.localMinOVE}
                onChange={(_e, { value }) =>
                  setParameters((prev) => ({
                    ...prev,
                    localMinOVE: Number.parseInt(value, 10),
                  }))
                }
                type="number"
                step="1"
              />
              <Form.Field
                control={Dropdown}
                search
                label="Algorithm"
                options={[
                  { key: "gliph1", text: "GLIPH1", value: "GLIPH1" },
                  { key: "gliph2", text: "GLIPH2", value: "GLIPH2" },
                ]}
                placeholder="GLIPH2"
                value="GLIPH2"
                fluid
                selection
                disabled
              />
              <Form.Field
                control={Dropdown}
                label="All AA Interchangeable"
                placeholder="1"
                options={[
                  { key: "1", text: "TRUE", value: 1 },
                  { key: "0", text: "FALSE", value: 0 },
                ]}
                selection
                fluid
                value={parameters.allAAInterchangeable}
                onChange={(_, { value }) =>
                  setParameters((prev) => ({
                    ...prev,
                    allAAInterchangeable: value,
                  }))
                }
              />
            </Grid.Column>
          </Grid>
          {saveParametersLoading && (
            <Message info content="Updating parameters..." />
          )}
          {saveParametersError && (
            <Message
              error
              content={`Error updating parameters: ${saveParametersError.message}`}
            />
          )}
        </Form>
      </Message>
    </Message>
  );
}

export default function RunParametersForm({ run }: Readonly<{ run: any }>) {
  const {
    outPrefix,
    localMinpValue,
    pDepth,
    globalConvergenceCutoff,
    simulationDepth,
    kmerMinDepth,
    localMinOVE,
    allAAInterchangeable,
  } = run;

  const initialData: RunParameters = {
    outPrefix: outPrefix || initialParameters.outPrefix,
    localMinpValue: localMinpValue || initialParameters.localMinpValue,
    pDepth: pDepth || initialParameters.pDepth,
    globalConvergenceCutoff: globalConvergenceCutoff || initialParameters.globalConvergenceCutoff,
    simulationDepth: simulationDepth || initialParameters.simulationDepth,
    kmerMinDepth: kmerMinDepth || initialParameters.kmerMinDepth,
    localMinOVE: localMinOVE || initialParameters.localMinOVE,
    allAAInterchangeable: allAAInterchangeable || initialParameters.allAAInterchangeable,
  };

  return (
    <RunParametersFormContent initialData={initialData} runID={run.id} />
  );
}