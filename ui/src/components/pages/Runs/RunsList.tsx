import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Loader,
  Dimmer,
  Card,
  Form,
  Input,
  Segment,
  Step,
  Icon,
  Divider,
  Grid,
  Button,
  Select,
} from "semantic-ui-react";
import { useLocation } from "react-router";
import useRunsQuery from "../../../hooks/useRunsQuery";
import AddRunModal from "./AddRunModal";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { tagColors } from "../Datasets/DatasetTag";
import { RunsListItem } from "./RunsListItem.tsx";

function uploadIncludesTag(upload, tagList) {
  return tagList?.every((tagName) => upload.upload?.dataset?.tags?.some((tag) => tag.name === tagName)) ?? false
}

function uploadIncludesCategory(upload, categoryList) {
  return categoryList?.every((categoryName) => upload.upload?.dataset?.tags?.some((tag) => tag.category === categoryName)) ?? false
}

export default function RunsList() {
  const { data, loading, refetch } = useRunsQuery();
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = React.useState([]);
  const [selectedCategories, setSelectedCategories] = React.useState([])
  const { data: tagNames } = useQuery(gql`
    query TagNames {
      tagNames
    }
  `);
  const { data: categories } = useQuery(gql`
    query TagCategories {
      tagCategories
    }  
  `)

  const location = useLocation();
  const runs = useMemo(() => {
    return data?.runs ?? [];
  }, [data]);

  const filteredRuns = useMemo(() => {
    let tempRuns =
      activeFilter === "all"
        ? runs
        : runs.filter((run) => run.status === activeFilter);
    if (searchTerm.trim().length > 0) {
      tempRuns = tempRuns.filter(
        (run) =>
          run.name?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
          run.description?.toLowerCase()?.includes(searchTerm.toLowerCase()),
      );
    }
    let results: any[] = [...tempRuns];
    if (selectedCategories.length > 0) {
      results = results.filter((run) =>
        run.processedDatasets?.reduce(
          (acc, upload) =>
            acc || uploadIncludesCategory(upload, selectedCategories),
          false,
        ),
      );
    }
    if (selectedTags.length > 0) {
      results = results.filter((run) =>
        run.processedDatasets?.reduce(
          (acc, upload) => acc || uploadIncludesTag(upload, selectedTags),
          false,
        ),
      );
    }
    return results;
  }, [activeFilter, searchTerm, selectedTags, selectedCategories, runs]);

  function toggleCategory(category) {
    if (selectedCategories.includes(category)) {
      setSelectedCategories((prev) => prev.filter((cat) => cat !== category))
    } else {
      setSelectedCategories((prev) => [...prev, category])
    }
  }

  useEffect(() => {
    refetch();
  }, [location.key, refetch]);

  // Initialize the counts object
  const counts = {
    pendingCount: 0,
    submittedCount: 0,
    completedCount: 0,
    failedCount: 0,
  };

  // Reduce projectRuns to count the statuses
  const { pendingCount, submittedCount, completedCount, failedCount } =
    runs.reduce((runCountsByStatus, { status }) => {
      switch (status) {
        case "pending":
          runCountsByStatus.pendingCount++;
          break;
        case "submitted":
          runCountsByStatus.submittedCount++;
          break;
        case "completed":
          runCountsByStatus.completedCount++;
          break;
        case "failed":
          runCountsByStatus.failedCount++;
          break;
      }
      return runCountsByStatus; // Return the updated counts object
    }, counts);

  // Calculate the total count of project runs
  const totalCount = runs.length;

  const runStatuses = [
    {
      key: "all",
      icon: "file",
      color: "black",
      title: `${totalCount} Total`,
    },
    {
      key: "pending",
      icon: "circle outline",
      color: "orange",
      title: `${pendingCount} Pending`,
      description: "To Submit",
    },
    {
      key: "submitted",
      icon: "circle notch",
      color: "yellow",
      title: `${submittedCount} Submitted`,
      description: "Computing",
    },
    {
      key: "completed",
      icon: "circle check",
      color: "green",
      title: `${completedCount} Completed`,
      description: "Successfully",
    },
    {
      key: "failed",
      icon: "times circle",
      color: "red",
      title: `${failedCount} Failed`,
      description: "Errored",
    },
  ];

  let content: React.JSX.Element
  if (loading) {
    content = (
      <Segment placeholder textAlign="center">
        <Dimmer active inverted>
          <Loader size="large">Loading...</Loader>
        </Dimmer>
      </Segment>
    )
  } else {
    content = (
      <Card.Group itemsPerRow={4} size="large">
        <AddRunModal refetch={refetch} />
        {filteredRuns.map((run) => (
          <RunsListItem key={run.id} run={run} refetch={refetch} />
        ))}
      </Card.Group>
    )
  }

  return (
    <Grid>
      <Grid.Column>
        <Divider horizontal content="Runs" />
        <Form>
          <Form.Field
            control={Input}
            label="Search runs"
            placeholder="Names and descriptions"
            onChange={(_e, { value }) => setSearchTerm(value)}
          />
          <Divider horizontal />
          <Form.Field label="Filter by tag categories" />
          <Form.Group inline>
            {
              categories?.tagCategories?.map((category) => 
                <Button
                  key={category}
                  content={category} 
                  size='tiny'
                  basic={!selectedCategories.includes(category)}
                  color={tagColors[category] ?? 'black'}
                  onClick={() => toggleCategory(category)}
                />
              )
            }
          </Form.Group>
          <Form.Dropdown
            control={Select}
            multiple
            options={Array.from(new Set(tagNames?.tagNames)).map((tag) => ({key: tag, value: tag, text: tag})) ?? []}
            placeholder='Select tags...'
            label="Filter by dataset tag(s)"
            onChange={(_e, { value }) => setSelectedTags(value)}
            search
          />
        </Form>
        <Step.Group fluid widths={5}>
          {runStatuses.map(({ key, icon, color, title, description }) => (
            <Step
              key={key}
              active={key === activeFilter} // Set active based on current filter
              onClick={() => setActiveFilter(key)} // Set the active filter
            >
              <Icon
                name={icon}
                color={color}
                loading={key === "submitted" && submittedCount !== 0}
              />
              <Step.Content title={title} description={description} />
            </Step>
          ))}
        </Step.Group>
        {content}
      </Grid.Column>
    </Grid>
  );
}
