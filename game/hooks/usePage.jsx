import { createContext, useContext, useState } from "react";

const PageContext = createContext(null);
const PageUpdaterContext = createContext(null);

export const PageContextProvider = ({ children }) => {
  const [page, setPage] = useState("home");

  return (
    <PageUpdaterContext.Provider value={setPage}>
      <PageContext.Provider value={page}>{children}</PageContext.Provider>
    </PageUpdaterContext.Provider>
  );
};

export const usePage = () => {
  const context = useContext(PageContext);
  if (context === null) {
    throw new Error("usePage must be used within a PageContextProvider");
  }
  return context;
};

export const useSetPage = () => {
  const setPage = useContext(PageUpdaterContext);
  if (setPage === null) {
    throw new Error("useSetPage must be used within a PageContextProvider");
  }
  return setPage;
};
