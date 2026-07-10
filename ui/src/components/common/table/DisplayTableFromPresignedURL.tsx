import { useState, useEffect } from 'react';
import { v4 as uuid4 } from 'uuid';
import { Segment, Table, Message, Dimmer, Loader } from 'semantic-ui-react';

function TableCell({ content }: Readonly<{ content: any }>) {
  return (
    <div
      style={{
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        maxWidth: "150px",
      }}
    >
      {content}
    </div>
  );
}

function TableRow({ row }: Readonly<{ row: any[] }>) {
  const cells = row.map(cell => ({
    id: uuid4(),
    content: (<TableCell content={cell} />)
  }))
  return cells.map(cell => (
    <Table.Cell key={cell.id}>
      {cell.content}
    </Table.Cell>
  ));
}

function TableBody({ content, rowsToShow }: Readonly<{ content: any[][], rowsToShow: number }>) {
  const rows = content.slice(1, rowsToShow + 1).map(row => ({
    id: uuid4(),
    content: (<TableRow row={row} />)
  }));
  return (
    <Table.Body>
      {rows.map((row) => (
        <Table.Row key={row.id}>{row.content}</Table.Row>
      ))}
    </Table.Body>
  );
}

export default function DisplayTableFromPresignedURL({ presignedURL, delimiter = ',', rowsToShow = 1000, header = true, color  = 'violet' }) {
  const [fileContent, setFileContent] = useState<string[][]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // Fetch data from the presigned URL
  useEffect(() => {
    if (presignedURL && loading) {
      fetch(presignedURL)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to fetch file content");
          }
          return response.text(); // Assuming text data
        })
        .then((data) => {
          const parsedData = data
            .split("\n")
            .map((row) => row.split(delimiter)); // Parse data using the provided delimiter
          setFileContent(parsedData);
          setTotalRows(parsedData.length - 1); // Exclude the header row
          setFetchError(false);
        })
        .catch((error) => {
          console.error("Error fetching file content:", error);
          setFetchError(true);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [presignedURL, delimiter, rowsToShow, loading]);

  if (loading) {
    return (
      <Segment placeholder textAlign="center">
        <Dimmer active inverted>
          <Loader size="large">Loading...</Loader>
        </Dimmer>
      </Segment>
    );
  }

  if (fetchError) {
    return (
      <Message negative>
        <Message.Header>Failed to Load Data</Message.Header>
        <p>Please check the presigned URL or try again later.</p>
      </Message>
    );
  }

  if (fileContent.length === 0) {
    return (
      <Message info>
        <Message.Header>No Data Available</Message.Header>
        <p>Please ensure the presigned URL is correct and contains valid data.</p>
      </Message>
    );
  }

  return (
    <Segment placeholder>
      <Segment basic color={color}>
        <div
          style={{ overflowX: "auto", overflowY: "scroll", maxHeight: "400px" }}
        >
          <Table celled>
            <Table.Header
              style={{ display: header ? "table-header-group" : "none" }}
            >
              <Table.Row>
                {fileContent[0]?.map((header, columnIndex) => (
                  <Table.HeaderCell
                    key={header || `Column ${columnIndex + 1}`}
                    style={{
                      position: "sticky",
                      top: 0,
                      background: "#F9FAFB",
                      zIndex: 2,
                      textAlign: "center",
                    }}
                  >
                    {header || `Column ${columnIndex + 1}`}
                  </Table.HeaderCell>
                ))}
              </Table.Row>
            </Table.Header>
            <TableBody content={fileContent} rowsToShow={rowsToShow} />
            <Table.Footer>
              <Table.Row>
                <Table.HeaderCell
                  colSpan={fileContent[0]?.length || 1}
                  style={{
                    position: "sticky",
                    bottom: 0,
                    background: "#F9FAFB",
                    zIndex: 1,
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontWeight: "bold" }}>
                    Showing {Math.min(rowsToShow, totalRows)} of {totalRows}{" "}
                    rows. Please download to see more.
                  </div>
                </Table.HeaderCell>
              </Table.Row>
            </Table.Footer>
          </Table>
        </div>
      </Segment>
    </Segment>
  );
}
