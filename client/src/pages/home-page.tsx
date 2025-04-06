import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export default function HomePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect based on user role
  useEffect(() => {
    if (user) {
      if (user.isAdmin) {
        setLocation('/admin');
      } else {
        setLocation('/dashboard');
      }
    }
  }, [user, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full inline-block mb-4"></div>
        <h2 className="text-xl font-medium">Redirecting to your dashboard...</h2>
      </div>
    </div>
  );
}
