import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import React, { useMemo } from "react";
import {
  Card,
  Button,
  Divider,
  Checkbox,
  Select,
  Form,
} from "semantic-ui-react";
import { tagColors } from "../Datasets/DatasetTag";
import { useKeycloak } from "../../../keycloak/KeycloakContext";
import { ProjectCard } from "./ProjectCard.tsx";

function datasetIncludesTag(dataset, tagList) {
  return tagList?.every((tagName) => dataset.tags?.some((tag) => tag.name === tagName)) ?? false
}

function datasetIncludesCategory(dataset, categoryList) {
  return categoryList?.every((categoryName) => dataset.tags?.some((tag) => tag.category === categoryName)) ?? false
}

export default function ProjectCardList({
  projects,
  updateSelectedUploads,
  selectedProjectIDs,
  toggleProjectID,
  canSelectAll
}) {
  const [usingPublicProjects, setUsingPublicProjects] = React.useState(true);
  const [selectedCategories, setSelectedCategories] = React.useState([])
  const [selectedTags, setSelectedTags] = React.useState([]);
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
  const projectsList = useMemo(() => {
    let tempProjects = usingPublicProjects
      ? [...projects]
      : projects?.filter((p) => !p.isPublic);
    if (selectedCategories.length > 0) {
      tempProjects = tempProjects.filter((project) =>
        project.datasets.reduce(
          (acc, dataset) =>
            acc || datasetIncludesCategory(dataset, selectedCategories),
          false,
        ),
      );
    }
    if (selectedTags.length > 0) {
      tempProjects = tempProjects.filter((p) =>
        p.datasets?.reduce(
          (acc, dataset) => acc || datasetIncludesTag(dataset, selectedTags),
          false,
        ),
      );
    }
    return tempProjects;
  }, [usingPublicProjects, projects, selectedCategories, selectedTags]);
  const selectedAll = projectsList?.length > 0 && projectsList.every((p) => selectedProjectIDs.includes(p.projectID));

  function handleSelectAll() {
    projectsList.forEach((project) => {
      const isSelected = selectedProjectIDs.includes(project.projectID);
      if (!isSelected) {
        toggleProjectID(project.projectID);
      }
    });
  }
  const { keycloak } = useKeycloak();
  const isAuthenticated = keycloak?.authenticated;

  function toggleCategory(category) {
    if (selectedCategories.includes(category)) {
      setSelectedCategories((prev) => prev.filter((cat) => cat !== category))
    } else {
      setSelectedCategories((prev) => [...prev, category])
    }
  }

  return (
    <>
      <Checkbox
        label="Include public projects"
        checked={usingPublicProjects}
        disabled={!isAuthenticated}
        onChange={() => setUsingPublicProjects(!usingPublicProjects)}
      />
      <Divider hidden />
      <Form.Field label="Filter by tag categories" />
      <Form.Group inline>
        {
          categories?.tagCategories?.map((category) => 
            <Button
              key={category}
              content={category ?? 'other'} 
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
      <Divider hidden />
      { canSelectAll && (
        <>
          <Button fluid onClick={handleSelectAll}>{selectedAll ? 'Deselect' : 'Select'} all</Button>
          <Divider hidden />
        </>
      )}
      <Card.Group itemsPerRow={3} style={{overflowY: "auto", minHeight: "460px", maxHeight: "500px"}}>
        {projectsList?.map((project) => (
          <ProjectCard
            key={project.projectID}
            project={project}
            updateSelectedUploads={updateSelectedUploads}
            selectedProjectIDs={selectedProjectIDs}
            toggleProjectID={toggleProjectID}
            selectedAll={selectedAll}
          />
        ))}
      </Card.Group>
      <Divider hidden />
    </>
  );
}
