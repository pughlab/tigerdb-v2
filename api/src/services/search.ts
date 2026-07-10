import {CDR3Filters, CDR3SearchInput} from "../schema/resolvers/search.ts";
import {runQuery} from "../neo4j.ts";

function parseValue(value: string | boolean): string | number | boolean {
    if (typeof value === "boolean") {
        return value
    }
    let parsedValue: number = Number.parseInt(value);
    if (!Number.isNaN(parsedValue)) {
        return parsedValue;
    }
    parsedValue = Number.parseFloat(value);
    if (!Number.isNaN(parsedValue)) {
        return parsedValue;
    }
    const sanitizeString = (str: string): string => str
        .replaceAll(/[^a-zA-Z0-9.\-_*]/g, "")
        .trim();
    return sanitizeString(value);
}

function buildTagConditions(tags: string[], categories: string[]): string {
    let condition: string = ''
    const hasTags: boolean = tags.length > 0;
    const hasCategories: boolean = categories.length > 0;

    if (hasTags || hasCategories) {
        condition += 'WHERE '
    }
    if (hasTags) {
        condition += `t.name IN [${tags.map((tag) => '"' + tag + '"').join(',')}]`
    }
    if (hasTags && hasCategories) {
        condition += ' AND '
    }
    if (hasCategories) {
        condition += `t.category IN [${categories.map((category) => '"' + category + '"').join(',')}]`
    }
    return condition
}


function buildFilters(cdr3Filters: CDR3Filters): string {
    let filters: string= '';

    if (cdr3Filters) {
        const filterArray: string[] = [];
        Object.keys(cdr3Filters).forEach((filter) => {
            let filterString: string = '';
            filterString += `v.${filter} IN [${(cdr3Filters[filter as keyof typeof cdr3Filters])?.map((value: string | boolean) => parseValue(value))}]`;
            filterArray.push(filterString);
        })

        if (filterArray.length > 0) {
            filters = `AND ${filterArray.join(' AND ')}`;
        }
    }

    return filters;
}

function bitapSearch(text: string, pattern: string, maxDifferences: number): boolean {
    if (text.length < pattern.length) {
        return false;
    }

    let differences = 0;
    for (let index = 0; index < pattern.length; index++) {
        if (text.charAt(index).toLowerCase() !== pattern.charAt(index).toLowerCase()) {
            differences++;
        }
        if (differences > maxDifferences) {
            return false;
        }
    }

    return true;
}

function fuzzinessScore(text: string, pattern: string): number {
    const nonMatchingPositions = [];
    for (let index = 0; index < pattern.length; index++) {
        if (text.charAt(index) !== pattern.charAt(index)) {
            nonMatchingPositions.push(index);
        }
    }

    return (1 - (nonMatchingPositions.length / pattern.length)) * 100;
}

export async function searchForCDRs(args: { input: CDR3SearchInput, skip: number, limit: number }) {
    const { cdr3b, filters, tags, categories, differenceFactor = 0.2 } = args.input;
    const skip = args.skip || 0;
    const limit = args.limit || 50;

    const tagConditions = buildTagConditions(tags || [], categories || []);
    const tagFilter = (tags?.length || categories?.length)
        ? `MATCH (d)-[]->(tags:Tag) ${tagConditions}`
        : '';
    const builtFilters = buildFilters(filters || {});

    let query = `MATCH (p:Project)-[]->(d:Dataset)
        ${tagFilter}
        WITH DISTINCT p, d
        OPTIONAL MATCH (d)-[]->(t:Tag)
        WITH p, d, collect(
            CASE WHEN t IS NOT NULL THEN {
                category: t.category,
                name: t.name
            } 
            END
        ) AS tags
        MATCH (d)-[]->(c:CuratedAnnotation)-[]->(v:AnnotationVariable)
        ${builtFilters}
        RETURN {
            projectID: p.projectID,
            projectName: p.projectName,
            datasetID: d.datasetID,
            datasetName: d.name,
            variableID: v.annotationVariableID,
            cdr3b: v.cdr3b,
            trbv: v.trbv,
            trbj: v.trbj,
            trav: v.trav,
            traj: v.traj,
            mhc: v.mhc,
            mhcClass: v.mhcClass,
            epitopeGene: v.epitopeGene,
            epitopeAAseq: v.epitopeAAseq,
            epitopeSpecies: v.epitopeSpecies,
            mutation: v.mutation,
            recognizesWTEpitope: v.recognizesWTEpitope,
            uniProt: v.uniProt,
            reference: v.reference,
            tags: tags
        } 
    AS data`

    if (args.limit) {
        query += ` LIMIT ${args.limit * 10}`;
    }
    const records = await runQuery(query);
    const variables = records.map((record) => record.get("data"));
    const term = (cdr3b ?? '').trim();
    let filteredVariables: any[]

    if (term) {
        const maxDifferences = Math.max(1, Math.ceil(differenceFactor * term.length));
        filteredVariables = variables
            .filter(variable => bitapSearch(variable.cdr3b || '', term, maxDifferences))
            .map(result => ({ ...result, score: fuzzinessScore(result.cdr3b || '', term) }))
            .sort((a, b) => (b.score || 0) - (a.score || 0));
    } else {
        filteredVariables = variables.map(variable => ({ ...variable, score: 0 }));
    }

    return {
        items: filteredVariables.slice(skip, skip + limit),
        totalCount: filteredVariables.length,
    }
}