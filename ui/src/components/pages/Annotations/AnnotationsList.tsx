import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  Form,
  Header,
  Label,
  Container,
  Segment,
  Dimmer,
  Loader,
  Message,
  List,
  Divider,
  Grid,
  Card,
  Icon,
  Popup, type SemanticCOLORS,
} from "semantic-ui-react";
import useRouter from "../../../hooks/useRouter";
import { useDebounce } from "use-debounce";
import { CSVLink } from "react-csv";

import { useLocation } from "react-router";

import { gql } from "@apollo/client";
import { useLazyQuery } from "@apollo/client/react";
import { DatasetReadonlyTag } from "../Datasets/DatasetTag";

const ITEMS_PER_PAGE = 20; // Adjust as needed
const INITIAL_DROPDOWN_FILTERS = {
  trbv: [],
  trbj: [],
  trav: [],
  traj: [],
  mhc: [],
  mhcClass: [],
  epitopeGene: [],
  epitopeAAseq: [],
  epitopeSpecies: [],
  mutation: [],
  recognizesWTEpitope: [],
  reference: [],
  uniProt: [],
}

function AnnotationListItemLabels({ dropdownFilters, values }) {
  const {
    highlightedCDR3b,
    trbv,
    trbj,
    trav,
    traj,
    mhc,
    mhcClass,
    epitopeAAseq,
    epitopeGene,
    epitopeSpecies,
    mutation,
    recognizesWTEpitope,
    uniProt,
  } = values;
  return (
    <Grid textAlign="center">
      <Grid.Row>
        <Grid.Column>
          <List.Header as={Header} color="blue">
            <div dangerouslySetInnerHTML={{ __html: highlightedCDR3b }} />
          </List.Header>
        </Grid.Column>
      </Grid.Row>
      <Grid.Row columns={5} divided textAlign="center">
        <Grid.Column>
          <Grid.Row>
            <Label
              basic={!dropdownFilters["trbv"].includes(trbv)}
              content="TRBV"
              detail={`${trbv || "NA"}`}
              color={dropdownFilters["trbv"].includes(trbv) ? "blue" : "grey"}
            />
          </Grid.Row>
          <Grid.Row>
            <Label
              basic={!dropdownFilters["trbj"].includes(trbj)}
              content="TRBJ"
              detail={`${trbj || "NA"}`}
              color={dropdownFilters["trbj"].includes(trbj) ? "blue" : "grey"}
            />
          </Grid.Row>
          <Grid.Row>
            <Label
              basic={!dropdownFilters["trav"].includes(trav)}
              content="TRAV"
              detail={`${trav || "NA"}`}
              color={dropdownFilters["trav"].includes(trav) ? "blue" : "grey"}
            />
          </Grid.Row>
          <Grid.Row>
            <Label
              basic={!dropdownFilters["traj"].includes(traj)}
              content="TRAJ"
              detail={`${traj || "NA"}`}
              color={dropdownFilters["traj"].includes(traj) ? "blue" : "grey"}
            />
          </Grid.Row>
        </Grid.Column>
        <Grid.Column>
          <Grid.Row>
            <Label
              basic={!dropdownFilters["mhc"].includes(mhc)}
              content="MHC"
              detail={`${mhc || "NA"}`}
              color={dropdownFilters["mhc"].includes(mhc) ? "blue" : "grey"}
            />
          </Grid.Row>
          <Grid.Row>
            <Label
              basic={!dropdownFilters["mhcClass"].includes(mhcClass)}
              content="MHC Class"
              detail={`${mhcClass || "NA"}`}
              color={
                dropdownFilters["mhcClass"].includes(mhcClass) ? "blue" : "grey"
              }
            />
          </Grid.Row>
        </Grid.Column>
        <Grid.Column>
          <Grid.Row>
            <Label
              basic={!dropdownFilters["epitopeAAseq"].includes(epitopeAAseq)}
              content="Epitope Amino Acid Sequence"
              detail={`${epitopeAAseq || "NA"}`}
              color={
                dropdownFilters["epitopeAAseq"].includes(epitopeAAseq)
                  ? "blue"
                  : "grey"
              }
            />
          </Grid.Row>
          <Grid.Row>
            <Label
              basic={!dropdownFilters["epitopeGene"].includes(epitopeGene)}
              content="Epitope Gene"
              detail={`${epitopeGene || "NA"}`}
              color={
                dropdownFilters["epitopeGene"].includes(epitopeGene)
                  ? "blue"
                  : "grey"
              }
            />
          </Grid.Row>
          <Grid.Row>
            <Label
              basic={
                !dropdownFilters["epitopeSpecies"].includes(epitopeSpecies)
              }
              content="Epitope Species"
              detail={`${epitopeSpecies || "NA"}`}
              color={
                dropdownFilters["epitopeSpecies"].includes(epitopeSpecies)
                  ? "blue"
                  : "grey"
              }
            />
          </Grid.Row>
        </Grid.Column>
        <Grid.Column>
          <Grid.Row>
            <Label
              basic={!dropdownFilters["mutation"].includes(mutation)}
              content="Mutation"
              detail={`${mutation || "NA"}`}
              color={
                dropdownFilters["mutation"].includes(mutation) ? "blue" : "grey"
              }
            />
          </Grid.Row>
          <Grid.Row>
            <Label
              basic={
                !dropdownFilters["recognizesWTEpitope"].includes(
                  recognizesWTEpitope,
                )
              }
              content="Recognizes Wild Type Epitope"
              detail={`${recognizesWTEpitope || "NA"}`}
              color={
                dropdownFilters["recognizesWTEpitope"].includes(
                  recognizesWTEpitope,
                )
                  ? "blue"
                  : "grey"
              }
            />
          </Grid.Row>
        </Grid.Column>
        <Grid.Column>
          <Grid.Row>
            <Label
              basic={!dropdownFilters["uniProt"].includes(uniProt)}
              content="UniProt"
              detail={`${uniProt || "NA"}`}
              color={
                dropdownFilters["uniProt"].includes(uniProt) ? "blue" : "grey"
              }
            />
          </Grid.Row>
        </Grid.Column>
      </Grid.Row>
    </Grid>
  );
}

function AnnotationListItem({ variable, cdr3SearchTerm, dropdownFilters }) {
  const {
    cdr3b,
    trbv,
    trbj,
    trav,
    traj,
    mhc,
    mhcClass,
    epitopeAAseq,
    epitopeGene,
    epitopeSpecies,
    mutation,
    recognizesWTEpitope,
    uniProt,
    reference,
    datasetName,
    projectID,
    projectName,
    score,
    tags,
  } = variable;
  const { navigate } = useRouter();

  // In the AnnotationListItem component
  const searchTerms = cdr3SearchTerm
    .split("|")
    .map((term) => term.trim())
    .filter((term) => term.length > 0);
  let highlightedCDR3b = cdr3b;

  searchTerms.forEach((term) => {
    // Create a case-insensitive regular expression for each term
    const regex = new RegExp(term, "gi");
    highlightedCDR3b = highlightedCDR3b.replace(
      regex,
      (match) => `<span style="color: red">${match}</span>`,
    );
  });

  let referenceButton: React.JSX.Element = <></>;

  if (reference) {
    referenceButton = (
      <Button fluid color="black">
        <Icon name="book" style={{ color: "white" }} />
        {reference}
      </Button>
    );
  } else if (datasetName) {
    referenceButton = (
      <Button fluid color="blue">
        <Icon name="database" style={{ color: "white" }} />
        {datasetName} - {projectName}
      </Button>
    );
  }

  const openDocument = (reference, projectID) => {
    if (reference?.startsWith("https")) {
      window.open(reference, "_blank");
    } else if (reference?.startsWith("PMID")) {
      const PMID = reference.split(":")[1].trim(); // Split by colon and get the number part
      window.open(`https://pubmed.ncbi.nlm.nih.gov/${PMID}/`, "_blank");
    } else {
      navigate(`/home/data/${projectID}`);
    }
  };

  const labelColor: SemanticCOLORS = (reference ? "black" : "white") as SemanticCOLORS;

  return (
    <>
      <Popup
        inverted
        content={
          reference
            ? `Click here to go to publication (${reference})`
            : `Click here to go to Project (${projectName})`
        }
        position="top center"
        icon={reference ? "book" : "database"}
        trigger={
          <List.Item
            as={Card}
            fluid
            style={{ cursor: "pointer", backgroundColor: "white" }}
            onClick={() => openDocument(reference, projectID)}
          >
            <Popup
              inverted
              content="Fuzziness match (string similarity score) based on bitap algorithm"
              trigger={
                <Label
                  as="a"
                  color="red"
                  ribbon
                  content="SCORE"
                  detail={`${score?.toFixed(2)}%`}
                />
              }
            />
            <Label
              attached="top right"
              color={labelColor}
              content={reference ? "Deorphanized TCR" : "Orphan TCR"}
            />
            <AnnotationListItemLabels
              dropdownFilters={dropdownFilters}
              values={{
                highlightedCDR3b,
                trbv,
                trbj,
                trav,
                traj,
                mhc,
                mhcClass,
                epitopeAAseq,
                epitopeGene,
                epitopeSpecies,
                mutation,
                recognizesWTEpitope,
                uniProt,
              }}
            />
            <Divider horizontal />
            <Label.Group>
              {[...tags]
                .sort((tag1, tag2) => {
                  if (tag1.name.toLowerCase() === tag2.name.toLowerCase()) {
                    return 0;
                  }
                  return tag1.name.toLowerCase() > tag2.name.toLowerCase()
                    ? 1
                    : -1;
                })
                .map((tag) => (
                  <DatasetReadonlyTag key={tag.tagID} tag={tag} />
                ))}
            </Label.Group>
            {referenceButton}
          </List.Item>
        }
      />
      <Divider horizontal hidden />
    </>
  );
}

function SearchForm({
  cdr3SearchTerm,
  setSearchResults,
  setCurrentPage,
  setLoadingResults,
  dropdownFilters,
  selectedTags = [],
  selectedCategories = [],
}) {
  const [findCDR3s, { data, loading }] = useLazyQuery(gql`
    query FindCDR3s($input: CDR3SearchInput!, $skip: Int!, $limit: Int!) {
      cdr3s(input: $input, skip: $skip, limit: $limit) {
        items {
          variableID
          projectID
          datasetName
          projectName
          cdr3b
          reference
          trbv
          trbj
          trav
          traj
          cdr3a
          mhc
          mhcClass
          epitopeAAseq
          epitopeGene
          epitopeSpecies
          mutation
          recognizesWTEpitope
          uniProt
          score
          tags {
            name
            category
          }
        }
        totalCount
      }
    }
  `);

  const [debouncedSearchText] = useDebounce(cdr3SearchTerm, 1000);
  const handleSearch = useCallback(() => {
    setLoadingResults(true);
    findCDR3s({
      variables: {
        input: {
          cdr3b: debouncedSearchText || "",
          tags: selectedTags,
          categories: selectedCategories,
          filters: Object.entries(dropdownFilters).reduce(
            (acc, [key, value]) => {
              if (Array.isArray(value) && value.length > 0) {
                acc[key] = value;
              }
              return acc;
            },
            {},
          ),
          // The difference factor determines the fuzziness of the search.
          // It must be a value between 0 and 1.
          // Higher factor values result in more fuzziness.
          differenceFactor: 0.2,
        },
        skip: 0,
        limit: 7000,
      },
    });
  }, [debouncedSearchText, dropdownFilters, findCDR3s, selectedCategories, selectedTags, setLoadingResults]);

  const location = useLocation();

  useEffect(() => {
    setLoadingResults(loading);
  }, [loading, setLoadingResults]);

  useEffect(() => {
    handleSearch();
  }, [
    location.key,
    debouncedSearchText,
    dropdownFilters,
    selectedTags,
    selectedCategories,
    handleSearch,
  ]);

  useEffect(() => {
    setSearchResults(data?.cdr3s?.items ?? []);
    setCurrentPage(1);
  }, [data, setCurrentPage, setSearchResults]);

  return <Form onSubmit={handleSearch} />;
}

function CSVDownloadButton({ searchResults }) {
  return (
    <CSVLink
      filename={`${globalThis.crypto.randomUUID()}_tigerdb_query_export.csv`}
      data={searchResults.map((result) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { __typename, ...item } = result;
        return item;
      })}
    >
      <Popup
        flowing
        on="hover"
        inverted
        position="top center"
        trigger={
          <Button
            inverted
            color="green"
            fluid
            icon="file excel"
            content={`Export all results as a CSV`}
          />
        }
        content="Click to download"
      ></Popup>
    </CSVLink>
  );
}

function ResultsPager({
  currentPage,
  totalPages,
  start,
  end,
  totalResults,
  setCurrentPage,
}) {
  return (
    <Divider horizontal>
      <Header as="h4">
        <Button.Group size="massive">
          <Button
            icon
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
          >
            <Icon name="chevron left" />
          </Button>
        </Button.Group>
        <span>
          {totalResults > 0 ? (
            <>
              Showing {start} to {end} of {totalResults} results{" "}
            </>
          ) : (
            <>No results</>
          )}
        </span>
        <Button.Group size="massive">
          <Button
            icon
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            <Icon name="chevron right" />
          </Button>
        </Button.Group>
      </Header>
    </Divider>
  );
}

export default function AnnotationsList({
  cdr3SearchTerm,
  selectedTags,
  selectedCategories,
}) {
  const [searchResults, setSearchResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(searchResults.length / ITEMS_PER_PAGE);
  const startResultNumber = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endResultNumber = Math.min(
    currentPage * ITEMS_PER_PAGE,
    searchResults.length,
  );
  const dropdownFilters = INITIAL_DROPDOWN_FILTERS;

  let toolsComponents: React.JSX.Element;

  if (loadingResults) {
    toolsComponents = (
      <Segment placeholder textAlign="center">
        <Dimmer active inverted>
          <Loader size="large">Loading...</Loader>
        </Dimmer>
      </Segment>
    );
  } else {
    toolsComponents = (
      <>
        <CSVDownloadButton searchResults={searchResults} />
        <ResultsPager
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          start={startResultNumber}
          end={endResultNumber}
          totalPages={totalPages}
          totalResults={searchResults.length}
        />
      </>
    );
  }

  return (
    <>
      <SearchForm
        setSearchResults={setSearchResults}
        setCurrentPage={setCurrentPage}
        setLoadingResults={setLoadingResults}
        dropdownFilters={dropdownFilters}
        cdr3SearchTerm={cdr3SearchTerm}
        selectedTags={selectedTags}
        selectedCategories={selectedCategories}
      />
      <Message>
        {toolsComponents}
        <Container>
          <List selection size="massive" key="annotationVariable">
            {searchResults
              .slice(
                (currentPage - 1) * ITEMS_PER_PAGE,
                currentPage * ITEMS_PER_PAGE,
              )
              .map((result) => (
                <AnnotationListItem
                  key={result.variableID}
                  variable={result}
                  cdr3SearchTerm={cdr3SearchTerm}
                  dropdownFilters={dropdownFilters}
                />
              ))}
          </List>
        </Container>
        {searchResults.length > 0 && (
          <ResultsPager
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            start={startResultNumber}
            end={endResultNumber}
            totalPages={totalPages}
            totalResults={searchResults.length}
          />
        )}
      </Message>
    </>
  );
}
