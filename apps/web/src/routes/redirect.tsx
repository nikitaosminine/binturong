import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

export default function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      navigate(isAuthenticated ? "/portfolios" : "/login", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  return null;
}
