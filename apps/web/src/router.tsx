import { createBrowserRouter } from "react-router-dom";
import RootLayout from "./routes/root";
import LoginPage from "./routes/login";
import PrivateRoute from "./routes/private";
import PortfoliosPage from "./routes/portfolios";
import PortfolioDetailPage from "./routes/portfolio-detail";
import ThesesPage from "./routes/theses";
import RootRedirect from "./routes/redirect";

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <RootRedirect /> },
      { path: "login", element: <LoginPage /> },
      {
        element: <PrivateRoute />,
        children: [
          { path: "portfolios", element: <PortfoliosPage /> },
          { path: "portfolios/:portfolioId", element: <PortfolioDetailPage /> },
          { path: "the-take", element: <ThesesPage /> },
        ],
      },
    ],
  },
]);
