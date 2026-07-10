import { atom, useAtom } from "jotai";
import { addDays, format } from "date-fns";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { useMemo } from "react";

const today = new Date();
const endDateAtom = atom(today);
const startDateAtom = atom((get) => addDays(get(endDateAtom), -364));

export default function useProjectsCalendarHeatmapQuery() {
  const [endDate, setEndDate] = useAtom(endDateAtom);
  const [startDate] = useAtom(startDateAtom);
  const { data, loading } = useQuery(
    gql`
      query test($startDate: Date!, $endDate: Date!) {
        projectsCalendarHeatmap(startDate: $startDate, endDate: $endDate) {
          date
          count
        }
      }
    `,
    {
      variables: { startDate, endDate },
    },
  );
  const heatmapData = useMemo(() => {
    if (data) {
      const dateCounts = Object.fromEntries(
        data.projectsCalendarHeatmap.map(
          ({ date, count }: { date: any; count: number }) => [date, count],
        ),
      );
      return Array.from({ length: 365 }, (_, i) => i).map((index) => {
        const date = format(addDays(endDate, -index), "yyyy-MM-dd");
        return {
          date,
          count: dateCounts[date] ?? 0,
        };
      });
    } else {
      return [];
    }
  }, [data, endDate]);
  console.log(heatmapData);
  return {
    variables: { startDate, endDate, setEndDate },
    heatmapData,
    loading,
  };
}
