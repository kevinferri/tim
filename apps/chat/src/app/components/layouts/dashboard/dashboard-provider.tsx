"use client";

import { createContext, useContext, useState, useMemo } from "react";
import { Circle, Topic } from "@prisma/client";

type ContextValue = {
  currentTopics: Topic[];
  currentCircles: Circle[];
};

type Props = {
  existingTopics: Topic[];
  existingCircles: Circle[];
  children: React.ReactNode;
};

const DashboardContext = createContext<ContextValue | undefined>(undefined);

export function CurrentTopicProvider(props: Props) {
  const [foo, setFoo] = useState();

  const contextValue = useMemo(
    () => ({
      foo,
    }),
    [foo]
  );

  return (
    <DashboardContext.Provider value={contextValue}>
      {props.children}
    </DashboardContext.Provider>
  );
}

export function useCurrentTopicContext() {
  const context = useContext(DashboardContext);

  if (!context) {
    throw new Error(
      "useDashboardContext must be used inside DashboardProvider"
    );
  }

  return context;
}
