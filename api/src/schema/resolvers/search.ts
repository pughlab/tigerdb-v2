import { searchForCDRs } from "../../services/search.ts";

export type CDR3Filters = {
  trbv?: string[];
  trbj?: string[];
  trav?: string[];
  traj?: string[];
  mhc?: string[];
  mhcClass?: string[];
  epitopeGene?: string[];
  epitopeAAseq?: string[];
  epitopeSpecies?: string[];
  mutation?: string[];
  recognizesWTEpitope?: boolean[];
  reference?: string[];
  uniProt?: string[];
};

export type CDR3SearchInput = {
  cdr3b?: string;
  filters?: CDR3Filters;
  differenceFactor?: number;
  tags?: string[];
  categories?: string[];
};

export default {
  Query: {
    cdr3s: async (
      _parent: unknown,
      args: { input: CDR3SearchInput; skip: number; limit: number },
    ) => {
      return await searchForCDRs(args);
    },
  },
  CDR3SearchResultsPage: {
    items: (results: any) => {
      return results.items;
    },
  },
  CDR3SearchResult: {
    tags: (result: any) => {
      return result.tags;
    },
  },
};
