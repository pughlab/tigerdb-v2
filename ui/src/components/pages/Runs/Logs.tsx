import React from 'react';
import { Divider, Header, Segment, Loader, Dimmer, Message } from 'semantic-ui-react';
import useRunLogsQuery from '../../../hooks/useRunLogsQuery';
import { useParams } from 'react-router'
import ThemedSegment from '../../common/ThemedSegment.tsx';
import { v4 as uuid4 } from 'uuid';

export default function Logs() {
  // Get the runID from context or props (assuming you're using useCrescentContext)
  const { runID } = useParams()

  // Fetch logs using the custom hook
  const { logs, loading } = useRunLogsQuery({ runID });

  // Utility functions to process the logs
  const splitByNewLine = (logs) => logs.split('\n').map((line) => line.trim());

  // Process and format logs
  const formatLogs = (logs) => {
    const lines = splitByNewLine(logs);
    const linesWithID = lines.map(line => ({
      id: uuid4(),
      content: line
    }))
    return linesWithID.map((line) => (
      <p key={line.id} style={{ margin: '0', padding: '2px 0', fontFamily: 'monospace' }}>
        {line.content}
      </p>
    ));
  };

  if (loading) {
    return (
      <ThemedSegment basic>
        <Dimmer active inverted>
          <Loader size='large'>Loading...</Loader>
        </Dimmer>
      </ThemedSegment>
    )
  }
  return (
    <>
      <Divider horizontal>
        <Header>
          Logs
          <Header.Subheader>
            Showing container logs for RUN ID: {runID}
          </Header.Subheader>
        </Header>
      </Divider>
      <Segment
        style={{
          overflowY: 'auto',
          backgroundColor: 'transparent',
          boxShadow: 'none',
          color: 'black',
          maxHeight : '34vh',
        }}
      >
        {logs ? (
          <pre style={{
            fontFamily: 'monospace',
            fontSize: '0.95em',
            lineHeight: '1.4',
            whiteSpace: 'pre-wrap',
            color: 'black',
          }}>
            {formatLogs(logs)}
          </pre>
        ) : (
          <Message>No Logs Available</Message>
        )}
      </Segment>
    </>
  );
};